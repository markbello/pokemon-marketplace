import { NextRequest, NextResponse } from 'next/server';
import { getAuth0Client } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { trackingService } from '@/lib/tracking-service';
import { sendOrderShippedEmail } from '@/lib/send-email';
import { detectRuntimeEnvironment } from '@/lib/env';
import { TEST_TRACKING_NUMBERS } from '@/lib/tracking-constants';

/**
 * POST /api/orders/[orderId]/ship
 * Mark an order as shipped and start tracking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    // Auth check
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;
    const { orderId } = await params;

    // Get body
    const body = await request.json();
    const { carrier, trackingNumber } = body;

    if (!carrier || !trackingNumber) {
      return NextResponse.json(
        { error: 'Carrier and tracking number are required' },
        { status: 400 },
      );
    }

    // Detect environment and validate test tracking numbers
    const environment = await detectRuntimeEnvironment();
    const isTestTracking = Object.values(TEST_TRACKING_NUMBERS).includes(trackingNumber as any);

    // Block test tracking numbers in production
    if (environment === 'prod' && isTestTracking) {
      return NextResponse.json(
        {
          error: 'Test tracking numbers are not allowed in production',
          detail: 'Please use a real tracking number from your shipping carrier',
        },
        { status: 400 },
      );
    }

    // Fetch order and verify seller ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        sellerId: true,
        status: true,
        shippingCarrier: true,
        trackingNumber: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.sellerId !== userId) {
      return NextResponse.json(
        { error: 'Only the seller can mark this order as shipped' },
        { status: 403 },
      );
    }

    if (order.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Only paid orders can be marked as shipped' },
        { status: 400 },
      );
    }

    // Check if already shipped
    if (order.shippingCarrier && order.trackingNumber) {
      return NextResponse.json(
        {
          error: 'Order already has shipping information',
          tracking: {
            carrier: order.shippingCarrier,
            trackingNumber: order.trackingNumber,
          },
        },
        { status: 400 },
      );
    }

    // Start tracking with Shippo and update order
    const result = await trackingService.startTracking(orderId, carrier, trackingNumber);

    // Send shipping notification email
    const emailResult = await sendOrderShippedEmail(orderId);

    if (!emailResult.success) {
      console.error('[Ship Order] Failed to send shipping email:', emailResult.error);
      // Don't fail the request if email fails - order is still shipped
    }

    return NextResponse.json({
      success: true,
      order: {
        id: result.order.id,
        carrier: result.order.shippingCarrier,
        trackingNumber: result.order.trackingNumber,
        fulfillmentStatus: result.order.fulfillmentStatus,
        shippedAt: result.order.shippedAt,
      },
      tracking: {
        trackingNumber: result.tracking.trackingNumber,
        carrier: result.tracking.carrier,
      },
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('[Ship Order] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to mark order as shipped',
      },
      { status: 500 },
    );
  }
}
