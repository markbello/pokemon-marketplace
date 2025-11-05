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

  if (!signature) {
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
    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        console.warn('checkout.session.completed event missing orderId in metadata');
        return NextResponse.json({ error: 'Missing orderId in metadata' }, { status: 400 });
      }

      // Update order status
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          stripePaymentIntentId: session.payment_intent as string | null,
          updatedAt: new Date(),
        },
      });

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
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

