import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  console.log('[Webhook] Received webhook request');
  
  if (!signature) {
    console.error('[Webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Get IP address and user agent for audit logging
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined;
  const userAgent = headersList.get('user-agent') || undefined;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    // Note: In production, ensure STRIPE_WEBHOOK_SECRET is set
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set - skipping signature verification');
      // Parse event without verification (for development/testing)
      event = JSON.parse(body) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${errorMessage}` },
      { status: 400 }
    );
  }

  try {
    console.log('[Webhook] Event type:', event.type);
    console.log('[Webhook] Event ID:', event.id);

    // Handle checkout.session.completed event (primary)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('[Webhook] Full session object:', JSON.stringify(session, null, 2));
      console.log('[Webhook] Session ID:', session.id);
      console.log('[Webhook] Session metadata:', session.metadata);
      console.log('[Webhook] Session metadata type:', typeof session.metadata);
      
      // Try to get orderId from metadata - handle both object and direct access
      let orderId = session.metadata?.orderId || (session.metadata as any)?.orderId;

      console.log('[Webhook] Order ID from metadata:', orderId);

      // Fallback: If metadata is missing, look up order by session ID
      if (!orderId) {
        console.warn('[Webhook] Order ID not found in metadata, looking up by session ID:', session.id);
        const orderBySession = await prisma.order.findUnique({
          where: { stripeSessionId: session.id },
          select: { id: true },
        });
        
        if (orderBySession) {
          orderId = orderBySession.id;
          console.log('[Webhook] Found order by session ID:', orderId);
        } else {
          console.error('[Webhook] Could not find order by session ID:', session.id);
          return NextResponse.json({ error: 'Missing orderId in metadata and order not found by session ID' }, { status: 400 });
        }
      }

      // Check if order exists
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!existingOrder) {
        console.error('[Webhook] Order not found:', orderId);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      console.log('[Webhook] Updating order:', orderId, 'from status:', existingOrder.status, 'to PAID');

      // Update order status
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          stripePaymentIntentId: session.payment_intent as string | null,
          updatedAt: new Date(),
        },
      });

      console.log('[Webhook] Order updated successfully:', order.id, 'status:', order.status);

      // Log payment completion
      await logAuditEvent({
        entityType: 'Order',
        entityId: orderId,
        action: 'PAYMENT_COMPLETED',
        userId: order.buyerId,
        ipAddress,
        userAgent,
        changes: {
          status: 'PAID',
          stripePaymentIntentId: session.payment_intent,
          stripeSessionId: session.id,
        },
        metadata: {
          eventId: event.id,
          eventType: event.type,
        },
      });

      console.log('[Webhook] Audit log created');
    } else if (event.type === 'payment_intent.succeeded') {
      // Fallback: Handle payment_intent.succeeded if checkout.session.completed isn't sent
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      let orderId = paymentIntent.metadata?.orderId;

      console.log('[Webhook] Payment Intent ID:', paymentIntent.id);
      console.log('[Webhook] Payment Intent metadata:', JSON.stringify(paymentIntent.metadata));
      console.log('[Webhook] Order ID from payment intent metadata:', orderId);

      // If orderId not in payment intent metadata, try to retrieve the checkout session
      if (!orderId && paymentIntent.metadata?.sessionId) {
        console.log('[Webhook] Looking up checkout session:', paymentIntent.metadata.sessionId);
        try {
          const session = await stripe.checkout.sessions.retrieve(paymentIntent.metadata.sessionId as string);
          orderId = session.metadata?.orderId;
          console.log('[Webhook] Found orderId from checkout session:', orderId);
        } catch (err) {
          console.error('[Webhook] Error retrieving checkout session:', err);
        }
      }

      // If still no orderId, try to find order by payment intent ID (already stored)
      if (!orderId) {
        console.log('[Webhook] Looking up order by payment intent ID:', paymentIntent.id);
        const orderByPaymentIntent = await prisma.order.findUnique({
          where: { stripePaymentIntentId: paymentIntent.id },
          select: { id: true },
        });
        
        if (orderByPaymentIntent) {
          orderId = orderByPaymentIntent.id;
          console.log('[Webhook] Found order by payment intent ID:', orderId);
        } else {
          // Last resort: find pending orders and match by checking session IDs
          console.log('[Webhook] Searching for pending orders to match...');
          const pendingOrders = await prisma.order.findMany({
            where: { status: 'PENDING' },
            select: { id: true, stripeSessionId: true },
            orderBy: { createdAt: 'desc' },
            take: 10, // Check recent 10 pending orders
          });

          for (const pendingOrder of pendingOrders) {
            if (pendingOrder.stripeSessionId) {
              try {
                const session = await stripe.checkout.sessions.retrieve(pendingOrder.stripeSessionId);
                if (session.payment_intent === paymentIntent.id) {
                  orderId = pendingOrder.id;
                  console.log('[Webhook] Matched order by session payment intent:', orderId);
                  break;
                }
              } catch (err) {
                // Skip if session retrieval fails
              }
            }
          }
        }
      }

      if (orderId) {
        // Check if order exists
        const existingOrder = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (existingOrder && existingOrder.status === 'PENDING') {
          console.log('[Webhook] Updating order from payment_intent:', orderId, 'from status:', existingOrder.status, 'to PAID');

          const order = await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'PAID',
              stripePaymentIntentId: paymentIntent.id,
              updatedAt: new Date(),
            },
          });

          await logAuditEvent({
            entityType: 'Order',
            entityId: orderId,
            action: 'PAYMENT_COMPLETED',
            userId: order.buyerId,
            ipAddress,
            userAgent,
            changes: {
              status: 'PAID',
              stripePaymentIntentId: paymentIntent.id,
            },
            metadata: {
              eventId: event.id,
              eventType: event.type,
              source: 'payment_intent.succeeded',
            },
          });

          console.log('[Webhook] Order updated from payment_intent event');
        } else if (existingOrder) {
          console.log('[Webhook] Order already processed, status:', existingOrder.status);
        }
      } else {
        console.log('[Webhook] Payment intent succeeded but could not find associated order');
      }
    } else {
      console.log('[Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    if (error instanceof Error) {
      console.error('[Webhook] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

