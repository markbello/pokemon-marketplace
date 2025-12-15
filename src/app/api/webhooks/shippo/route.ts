import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapShippoStatusToFulfillment, trackingService } from '@/lib/tracking-service';
import {
  sendOrderShippedEmail,
  sendOrderInTransitEmail,
  sendOrderDeliveredEmail,
  sendDeliveryExceptionEmail,
} from '@/lib/send-email';
import { getShippoWebhookSecret } from '@/lib/env';
import type { Prisma } from '@prisma/client';

/**
 * Shippo Webhook Handler (PM-64)
 *
 * Handles tracking status updates from Shippo.
 * Triggers email notifications based on delivery status.
 */

type ShippoWebhookEvent = {
  event: string;
  data: {
    carrier: string;
    tracking_number: string;
    tracking_status: {
      status: string;
      status_details?: string;
      status_date?: string;
    };
    metadata?: string;
  };
  test: boolean;
};

/**
 * Verify Shippo webhook signature
 * TODO: Implement actual signature verification when Shippo provides it
 */
function verifySignature(payload: string, signature: string | null): boolean {
  const webhookSecret = getShippoWebhookSecret();

  if (!webhookSecret) {
    console.warn('[Shippo Webhook] No webhook secret configured - skipping verification');
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  // TODO: Implement Shippo's signature verification algorithm
  // See: https://docs.goshippo.com/docs/webhooks/webhooks/
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shippo-signature');

    // Verify signature
    const isValid = verifySignature(body, signature);
    if (!isValid) {
      console.error('[Shippo Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: ShippoWebhookEvent = JSON.parse(body);

    console.log('[Shippo Webhook] Received event:', payload.event);

    // Handle track_updated events
    if (payload.event === 'track_updated') {
      const { carrier, tracking_number, tracking_status, metadata } = payload.data;

      // Parse metadata
      let meta: { environment?: string; orderId?: string; isTest?: boolean } = {};
      if (metadata) {
        try {
          meta = JSON.parse(metadata);
        } catch {
          // Ignore metadata parsing errors
        }
      }

      // Skip test shipments in production
      // Note: With dual Vercel projects (PM-67), test shipments should only go to staging
      if (process.env.RUNTIME_ENV === 'production' && (meta.isTest || payload.test)) {
        console.log('[Shippo Webhook] Skipping test shipment in production:', tracking_number);
        return NextResponse.json({
          received: true,
          skipped: 'test shipment in production',
        });
      }

      // Find order by tracking number
      const order = await prisma.order.findFirst({
        where: {
          trackingNumber: tracking_number,
          shippingCarrier: carrier,
        },
      });

      if (!order) {
        console.warn(
          `[Shippo Webhook] Order not found for tracking: ${tracking_number} (${carrier})`,
        );
        return NextResponse.json({ received: true, warning: 'order not found' });
      }

      // Map Shippo status to our fulfillment status
      const fulfillmentStatus = mapShippoStatusToFulfillment(tracking_status.status);

      if (!fulfillmentStatus) {
        console.log(
          `[Shippo Webhook] Unknown status for order ${order.id.slice(-8)}: ${tracking_status.status}`,
        );
        return NextResponse.json({ received: true });
      }

      // Don't downgrade status (e.g., from DELIVERED back to IN_TRANSIT)
      const currentStatus = order.fulfillmentStatus;
      const statusOrder = [
        'PENDING',
        'PROCESSING',
        'SHIPPED',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
      ];
      const currentIndex = statusOrder.indexOf(currentStatus);
      const newIndex = statusOrder.indexOf(fulfillmentStatus);

      if (currentIndex >= newIndex && fulfillmentStatus !== 'EXCEPTION') {
        console.log(
          `[Shippo Webhook] Not updating order ${order.id.slice(-8)} from ${currentStatus} to ${fulfillmentStatus}`,
        );
        return NextResponse.json({ received: true, skipped: 'status downgrade prevented' });
      }

      // Update order and create event
      const timestamp = new Date();
      const updateData: any = {
        fulfillmentStatus,
      };

      if (fulfillmentStatus === 'DELIVERED') {
        updateData.deliveredAt = timestamp;
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.order.update({
          where: { id: order.id },
          data: updateData,
        });

        // Map fulfillment status to event type
        let eventType:
          | 'IN_TRANSIT'
          | 'OUT_FOR_DELIVERY'
          | 'DELIVERED'
          | 'DELIVERY_EXCEPTION'
          | null = null;
        if (fulfillmentStatus === 'IN_TRANSIT') {
          eventType = 'IN_TRANSIT';
        } else if (fulfillmentStatus === 'OUT_FOR_DELIVERY') {
          eventType = 'OUT_FOR_DELIVERY';
        } else if (fulfillmentStatus === 'DELIVERED') {
          eventType = 'DELIVERED';
        } else if (fulfillmentStatus === 'EXCEPTION') {
          eventType = 'DELIVERY_EXCEPTION';
        }

        // Create OrderEvent if applicable
        if (eventType) {
          await tx.orderEvent.create({
            data: {
              orderId: order.id,
              type: eventType,
              timestamp,
              metadata: {
                status: tracking_status.status,
                statusDetails: tracking_status.status_details,
                statusDate: tracking_status.status_date,
                trackingNumber: tracking_number,
                carrier,
              },
            },
          });
        }
      });

      console.log(
        `[Shippo Webhook] Order ${order.id.slice(-8)} updated: ${currentStatus} → ${fulfillmentStatus}`,
      );

      // Send appropriate emails
      if (fulfillmentStatus === 'IN_TRANSIT') {
        const result = await sendOrderInTransitEmail(order.id);
        if (result.success) {
          console.log(`[Shippo Webhook] In-transit email sent for order ${order.id.slice(-8)}`);
        } else {
          console.error(`[Shippo Webhook] Failed to send in-transit email: ${result.error}`);
        }
      } else if (fulfillmentStatus === 'DELIVERED') {
        const result = await sendOrderDeliveredEmail(order.id);
        if (result.success) {
          console.log(`[Shippo Webhook] Delivery email sent for order ${order.id.slice(-8)}`);
        } else {
          console.error(`[Shippo Webhook] Failed to send delivery email: ${result.error}`);
        }
      } else if (fulfillmentStatus === 'EXCEPTION') {
        const exceptionReason = tracking_status.status_details || 'Delivery issue detected';
        const result = await sendDeliveryExceptionEmail(order.id, exceptionReason);
        if (result.success) {
          console.log(`[Shippo Webhook] Exception email sent for order ${order.id.slice(-8)}`);
        } else {
          console.error(`[Shippo Webhook] Failed to send exception email: ${result.error}`);
        }
      }

      return NextResponse.json({
        received: true,
        orderId: order.id.slice(-8),
        status: fulfillmentStatus,
      });
    }

    // Unknown event type
    console.log(`[Shippo Webhook] Unhandled event type: ${payload.event}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Shippo Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Handle GET requests (for webhook verification/testing)
export async function GET() {
  return NextResponse.json({
    service: 'Shippo Webhook Handler',
    status: 'active',
  });
}
