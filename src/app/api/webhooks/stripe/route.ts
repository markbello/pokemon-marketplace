import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { getSessionTaxInfo } from '@/lib/stripe-addresses';
import { sendOrderConfirmationEmail, sendSellerOrderNotificationEmail } from '@/lib/send-email';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe-client';
import { getStripeWebhookSecret } from '@/lib/env';
import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Stripe Webhook Handler for Listing-Based Purchases (PM-39)
 *
 * This is the primary source of truth for payment-side state changes.
 * When a checkout.session.completed event is received:
 * 1. The Order status is updated to PAID
 * 2. The associated Listing (if any) is marked as SOLD
 *
 * Idempotency: This handler safely handles duplicate webhook deliveries by:
 * - Checking order status before updating (skip if already PAID)
 * - Checking listing status before updating (skip if already SOLD)
 * - Using transactions to ensure atomicity
 *
 * The redirect-based success page acts as a fallback with the same checks.
 */

/**
 * Process a successful listing purchase - update order and listing status atomically.
 * Idempotent: safe to call multiple times for the same order.
 */
async function processListingPurchase(params: {
  prisma: PrismaClient;
  orderId: string;
  stripePaymentIntentId: string | null;
  stripeSessionId: string;
  stripeCustomerId: string | null;
  taxInfo: {
    subtotalCents: number;
    taxCents: number;
    shippingCents: number;
    totalCents: number;
  } | null;
  eventId: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{
  order: Awaited<ReturnType<PrismaClient['order']['findUnique']>>;
  listingUpdated: boolean;
  orderAlreadyPaid: boolean;
}> {
  const {
    prisma,
    orderId,
    stripePaymentIntentId,
    stripeSessionId,
    stripeCustomerId,
    taxInfo,
    eventId,
    eventType,
    ipAddress,
    userAgent,
  } = params;

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Fetch order with its associated listing
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { listing: true },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Idempotency check: if order is already PAID, skip update
    const orderAlreadyPaid = order.status === 'PAID';

    // Update order to PAID if not already
    const updatedOrder = orderAlreadyPaid
      ? order
      : await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            stripePaymentIntentId,
            // PM-56: Store Stripe customer ID for address lookups
            stripeCustomerId: stripeCustomerId || undefined,
            // PM-56: Store tax/shipping breakdown from Stripe
            subtotalCents: taxInfo?.subtotalCents,
            taxCents: taxInfo?.taxCents,
            shippingCents: taxInfo?.shippingCents,
            totalCents: taxInfo?.totalCents,
            updatedAt: new Date(),
          },
          include: { listing: true },
        });

    // Create ORDER_CREATED event if this is a new paid order (not already paid)
    if (!orderAlreadyPaid) {
      // Create ORDER_CREATED event with the original order creation time
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'ORDER_CREATED',
          timestamp: order.createdAt,
          metadata: {
            listingId: order.listingId,
          },
        },
      });

      // Create PAYMENT_RECEIVED event
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'PAYMENT_RECEIVED',
          metadata: {
            stripePaymentIntentId,
            stripeSessionId,
            amount: taxInfo?.totalCents,
          },
        },
      });
    }

    // Mark listing as SOLD if:
    // 1. Order is linked to a listing
    // 2. Listing exists and is still PUBLISHED (idempotency check)
    let listingUpdated = false;
    if (order.listingId && order.listing && order.listing.status === 'PUBLISHED') {
      await tx.listing.update({
        where: { id: order.listingId },
        data: { status: 'SOLD' },
      });
      listingUpdated = true;
      console.log('[Webhook] Listing marked as SOLD:', order.listingId);
    } else if (order.listingId && order.listing?.status === 'SOLD') {
      console.log('[Webhook] Listing already SOLD (idempotent):', order.listingId);
    }

    return { order: updatedOrder, listingUpdated, orderAlreadyPaid };
  });

  // Log audit event outside transaction
  await logAuditEvent({
    entityType: 'Order',
    entityId: orderId,
    action: 'PAYMENT_COMPLETED',
    userId: result.order.buyerId,
    ipAddress,
    userAgent,
    changes: {
      status: 'PAID',
      stripePaymentIntentId,
      stripeSessionId,
      listingId: result.order.listingId,
      listingMarkedSold: result.listingUpdated,
    },
    metadata: {
      eventId,
      eventType,
      idempotent: result.orderAlreadyPaid,
    },
  });

  // If listing was updated, log that too
  if (result.listingUpdated && result.order.listingId) {
    await logAuditEvent({
      entityType: 'Listing',
      entityId: result.order.listingId,
      action: 'MARKED_SOLD',
      userId: result.order.buyerId,
      ipAddress,
      userAgent,
      changes: {
        status: 'SOLD',
        orderId,
      },
      metadata: {
        eventId,
        eventType,
        source: 'webhook',
      },
    });
  }

  return {
    order: result.order,
    listingUpdated: result.listingUpdated,
    orderAlreadyPaid: result.orderAlreadyPaid,
  };
}

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

  // Get Stripe client for API calls
  const stripe = await getStripeClient();

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    const webhookSecret = getStripeWebhookSecret();

    if (!webhookSecret) {
      console.warn(
        '[Webhook] STRIPE_WEBHOOK_SECRET not set - skipping signature verification (DEVELOPMENT ONLY)',
      );
      // Parse event without verification (for development/testing)
      event = JSON.parse(body) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('[Webhook] Signature verified successfully');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Webhook] Signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${errorMessage}` },
      { status: 400 },
    );
  }

  try {
    console.log('[Webhook] Event type:', event.type);
    console.log('[Webhook] Event ID:', event.id);

    // Handle checkout.session.completed event (primary handler for listing purchases)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log('[Webhook] Processing checkout.session.completed');
      console.log('[Webhook] Session ID:', session.id);
      console.log('[Webhook] Session metadata:', JSON.stringify(session.metadata));

      // Extract metadata
      const orderId = session.metadata?.orderId;
      const listingId = session.metadata?.listingId;

      console.log('[Webhook] Order ID from metadata:', orderId);
      console.log('[Webhook] Listing ID from metadata:', listingId);

      // Try to find order by metadata or session ID
      let resolvedOrderId = orderId;

      if (!resolvedOrderId) {
        console.warn('[Webhook] Order ID not in metadata, looking up by session ID:', session.id);
        const orderBySession = await prisma.order.findUnique({
          where: { stripeSessionId: session.id },
          select: { id: true },
        });

        if (orderBySession) {
          resolvedOrderId = orderBySession.id;
          console.log('[Webhook] Found order by session ID:', resolvedOrderId);
        } else {
          console.error('[Webhook] Could not find order for session:', session.id);
          return NextResponse.json({ error: 'Order not found for session' }, { status: 400 });
        }
      }

      // PM-56: Get tax/shipping breakdown from Stripe
      const taxInfo = await getSessionTaxInfo(session.id);
      console.log('[Webhook] Tax info:', taxInfo);

      // PM-56: Get customer ID for address lookups
      const stripeCustomerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
      console.log('[Webhook] Stripe Customer ID:', stripeCustomerId);

      // Process the purchase (order + listing update) atomically
      const { order, listingUpdated, orderAlreadyPaid } = await processListingPurchase({
        prisma,
        orderId: resolvedOrderId,
        stripePaymentIntentId: session.payment_intent as string | null,
        stripeSessionId: session.id,
        stripeCustomerId,
        taxInfo,
        eventId: event.id,
        eventType: event.type,
        ipAddress,
        userAgent,
      });

      console.log('[Webhook] Purchase processed successfully');
      console.log('[Webhook] Order ID:', order?.id, 'Status:', order?.status);
      console.log('[Webhook] Listing updated:', listingUpdated);

      // Send confirmation email only on first payment (idempotent)
      if (!orderAlreadyPaid) {
        try {
          const emailResult = await sendOrderConfirmationEmail(resolvedOrderId, {
            ipAddress,
            userAgent,
          });
          if (!emailResult.success) {
            console.error('[Webhook] Failed to send order confirmation email:', emailResult.error);
          } else {
            console.log('[Webhook] Order confirmation email sent, id:', emailResult.id);
          }
        } catch (err) {
          console.error('[Webhook] Unexpected error sending confirmation email:', err);
        }

        try {
          const sellerEmailResult = await sendSellerOrderNotificationEmail(resolvedOrderId, {
            ipAddress,
            userAgent,
          });
          if (!sellerEmailResult.success) {
            console.error(
              '[Webhook] Failed to send seller order notification:',
              sellerEmailResult.error,
            );
          } else {
            console.log('[Webhook] Seller order notification sent, id:', sellerEmailResult.id);
          }
        } catch (err) {
          console.error('[Webhook] Unexpected error sending seller order notification:', err);
        }
      } else {
        console.log('[Webhook] Skipping confirmation email (order already paid).');
      }
    } else if (event.type === 'payment_intent.succeeded') {
      // Fallback: Handle payment_intent.succeeded if checkout.session.completed isn't received
      // This provides redundancy for listing-based purchases
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log('[Webhook] Processing payment_intent.succeeded (fallback)');
      console.log('[Webhook] Payment Intent ID:', paymentIntent.id);
      console.log('[Webhook] Payment Intent metadata:', JSON.stringify(paymentIntent.metadata));

      let orderId: string | undefined = paymentIntent.metadata?.orderId;

      // If orderId not in payment intent metadata, try to retrieve the checkout session
      if (!orderId && paymentIntent.metadata?.sessionId) {
        console.log('[Webhook] Looking up checkout session:', paymentIntent.metadata.sessionId);
        try {
          const session = await stripe.checkout.sessions.retrieve(paymentIntent.metadata.sessionId);
          orderId = session.metadata?.orderId;
          console.log('[Webhook] Found orderId from checkout session:', orderId);
        } catch (err) {
          console.error('[Webhook] Error retrieving checkout session:', err);
        }
      }

      // If still no orderId, try to find order by payment intent ID
      if (!orderId) {
        console.log('[Webhook] Looking up order by payment intent ID:', paymentIntent.id);
        const orderByPaymentIntent = await prisma.order.findUnique({
          where: { stripePaymentIntentId: paymentIntent.id },
          select: { id: true, stripeSessionId: true },
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
            take: 10,
          });

          for (const pendingOrder of pendingOrders) {
            if (pendingOrder.stripeSessionId) {
              try {
                const session = await stripe.checkout.sessions.retrieve(
                  pendingOrder.stripeSessionId,
                );
                if (session.payment_intent === paymentIntent.id) {
                  orderId = pendingOrder.id;
                  console.log('[Webhook] Matched order by session payment intent:', orderId);
                  break;
                }
              } catch {
                // Skip if session retrieval fails
              }
            }
          }
        }
      }

      if (orderId) {
        // Check if order exists and needs processing
        const existingOrder = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true, stripeSessionId: true },
        });

        if (existingOrder && existingOrder.status === 'PENDING') {
          // PM-56: Try to get tax info from session if available
          let taxInfo = null;
          let stripeCustomerId = null;

          if (existingOrder.stripeSessionId) {
            taxInfo = await getSessionTaxInfo(existingOrder.stripeSessionId);
            try {
              const session = await stripe.checkout.sessions.retrieve(
                existingOrder.stripeSessionId,
              );
              stripeCustomerId =
                typeof session.customer === 'string'
                  ? session.customer
                  : session.customer?.id || null;
            } catch {
              // Ignore if session retrieval fails
            }
          }

          // Use the same processing function for consistency
          const { order, listingUpdated, orderAlreadyPaid } = await processListingPurchase({
            prisma,
            orderId,
            stripePaymentIntentId: paymentIntent.id,
            stripeSessionId: existingOrder.stripeSessionId || '',
            stripeCustomerId,
            taxInfo,
            eventId: event.id,
            eventType: event.type,
            ipAddress,
            userAgent,
          });

          console.log('[Webhook] Purchase processed from payment_intent event');
          console.log('[Webhook] Order ID:', order?.id, 'Status:', order?.status);
          console.log('[Webhook] Listing updated:', listingUpdated);

          if (!orderAlreadyPaid) {
            try {
              const emailResult = await sendOrderConfirmationEmail(orderId, {
                ipAddress,
                userAgent,
              });
              if (!emailResult.success) {
                console.error(
                  '[Webhook] Failed to send order confirmation email:',
                  emailResult.error,
                );
              } else {
                console.log('[Webhook] Order confirmation email sent, id:', emailResult.id);
              }
            } catch (err) {
              console.error('[Webhook] Unexpected error sending confirmation email:', err);
            }
            try {
              const sellerEmailResult = await sendSellerOrderNotificationEmail(orderId, {
                ipAddress,
                userAgent,
              });
              if (!sellerEmailResult.success) {
                console.error(
                  '[Webhook] Failed to send seller order notification:',
                  sellerEmailResult.error,
                );
              } else {
                console.log('[Webhook] Seller order notification sent, id:', sellerEmailResult.id);
              }
            } catch (err) {
              console.error('[Webhook] Unexpected error sending seller order notification:', err);
            }
          } else {
            console.log('[Webhook] Skipping confirmation email (order already paid).');
          }
        } else if (existingOrder) {
          console.log(
            '[Webhook] Order already processed (idempotent), status:',
            existingOrder.status,
          );
        }
      } else {
        console.log('[Webhook] Payment intent succeeded but could not find associated order');
        // This is logged but not an error - could be a non-listing payment
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
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
