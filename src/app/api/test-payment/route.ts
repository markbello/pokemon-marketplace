import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getBaseUrl } from '@/lib/utils';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer';
import { getOrCreateUser } from '@/lib/user';
import { logAuditEvent } from '@/lib/audit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export async function POST(request: Request) {
  try {
    // 1. Check authentication
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Parse request body to get timezone
    const body = await request.json().catch(() => ({}));
    const purchaseTimezone = body.timezone || undefined;

    // Get IP address and user agent for audit logging
    const headersList = await headers();
    const ipAddress =
      headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    // 2. Get or create user in database
    const user = await getOrCreateUser(userId);

    // 3. Create order in our system first
    const order = await prisma.order.create({
      data: {
        buyerId: userId,
        description: 'Test Payment - Stripe Integration',
        amountCents: 100, // $1.00
        currency: 'USD',
        status: 'PENDING',
        isTestPayment: true,
        sellerName: 'Pokemon Marketplace', // Platform as seller for now
        purchaseTimezone,
      },
    });

    // 4. Log order creation
    await logAuditEvent({
      entityType: 'Order',
      entityId: order.id,
      action: 'CREATE',
      userId: userId,
      ipAddress,
      userAgent,
      changes: {
        orderId: order.id,
        amountCents: order.amountCents,
        isTestPayment: true,
      },
    });

    // 5. Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      userId,
      userEmail,
      user.displayName || session.user.name || undefined,
    );

    const baseUrl = getBaseUrl();

    // 6. Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Order #${order.id.slice(-8)}`,
              description: order.description,
            },
            unit_amount: order.amountCents, // Already in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        description: `${order.description} - Order #${order.id.slice(-8)}`,
        metadata: {
          orderId: order.id,
          userId: userId,
          isTestPayment: 'true',
        },
      },
      metadata: {
        orderId: order.id,
        userId: userId,
        isTestPayment: 'true',
      },
      success_url: `${baseUrl}/test-stripe/success?orderId=${order.id}`,
      cancel_url: `${baseUrl}/test-stripe`,
    });

    console.log('[Test Payment] Created checkout session:', checkoutSession.id);
    console.log('[Test Payment] Session metadata:', checkoutSession.metadata);
    console.log('[Test Payment] Order ID:', order.id);

    // 7. Link Stripe session to our order
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating test payment:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: `Stripe error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
