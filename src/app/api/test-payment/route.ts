import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getBaseUrl } from '@/lib/utils';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer';
import { getOrCreateUser } from '@/lib/user';
import { logAuditEvent } from '@/lib/audit';
import { stripe } from '@/lib/stripe-client';

/**
 * Test Payment API - Creates a test listing and purchase to verify webhook flow (PM-39)
 *
 * This creates:
 * 1. A test listing (marked as PUBLISHED)
 * 2. An order linked to that listing
 * 3. A Stripe checkout session with proper metadata
 *
 * When payment completes, the webhook should:
 * - Update the order to PAID
 * - Mark the listing as SOLD
 */
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

    // 2. Get or create user in database (as both seller and buyer for test)
    const user = await getOrCreateUser(userId);

    // 3. Create a test listing (user sells to themselves for testing)
    const testListing = await prisma.listing.create({
      data: {
        sellerId: userId,
        displayTitle: `Test Card - ${new Date().toISOString().slice(0, 16)}`,
        sellerNotes: 'This is a test listing created for webhook testing (PM-39)',
        askingPriceCents: 100, // $1.00
        currency: 'USD',
        status: 'PUBLISHED',
      },
    });

    console.log('[Test Payment] Created test listing:', testListing.id);

    // 4. Create order linked to the test listing
    // subtotalCents = item price, totalCents = same initially (webhook updates with tax/shipping)
    const order = await prisma.order.create({
      data: {
        buyerId: userId,
        sellerId: userId, // Self-purchase for testing
        sellerName: user.displayName || 'Test Seller',
        description: `Test Listing Purchase - ${testListing.displayTitle}`,
        subtotalCents: testListing.askingPriceCents,
        totalCents: testListing.askingPriceCents, // Updated by webhook with actual amount
        currency: testListing.currency,
        status: 'PENDING',
        isTestPayment: true,
        purchaseTimezone,
        // Link to the listing (PM-33/PM-39)
        listingId: testListing.id,
        snapshotListingDisplayTitle: testListing.displayTitle,
        snapshotListingImageUrl: testListing.imageUrl,
        snapshotListingPriceCents: testListing.askingPriceCents,
      },
    });

    console.log('[Test Payment] Created order:', order.id, 'linked to listing:', testListing.id);

    // 5. Log order creation
    await logAuditEvent({
      entityType: 'Order',
      entityId: order.id,
      action: 'CREATE',
      userId: userId,
      ipAddress,
      userAgent,
      changes: {
        orderId: order.id,
        listingId: testListing.id,
        subtotalCents: order.subtotalCents,
        isTestPayment: true,
      },
    });

    // 6. Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      userId,
      userEmail,
      user.displayName || session.user.name || undefined,
    );

    const baseUrl = getBaseUrl();

    // 7. Create Stripe checkout session with listing metadata (matches listing checkout flow)
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: testListing.displayTitle,
              description: 'Test listing purchase for webhook verification',
              // Tax code for general merchandise (trading cards)
              tax_code: 'txcd_99999999',
            },
            unit_amount: order.subtotalCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // PM-56: Enable automatic tax calculation
      // NOTE: Requires tax registration in Stripe Dashboard (Settings > Tax > Add registration)
      // Disabled for now - enable once tax registration is configured
      // automatic_tax: {
      //   enabled: true,
      // },
      // PM-56: Collect shipping address during checkout
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      // PM-56: Save addresses to Stripe Customer for future orders
      customer_update: {
        shipping: 'auto',
        address: 'auto',
      },
      payment_intent_data: {
        description: `Test Listing Purchase - ${testListing.displayTitle}`,
        metadata: {
          orderId: order.id,
          buyerId: userId,
          listingId: testListing.id,
          isTestPayment: 'true',
        },
      },
      // This metadata is what the webhook reads
      metadata: {
        orderId: order.id,
        buyerId: userId,
        listingId: testListing.id,
        isTestPayment: 'true',
      },
      success_url: `${baseUrl}/test-stripe/success?orderId=${order.id}&listingId=${testListing.id}`,
      cancel_url: `${baseUrl}/test-stripe`,
    });

    console.log('[Test Payment] Created checkout session:', checkoutSession.id);
    console.log('[Test Payment] Session metadata:', checkoutSession.metadata);

    // 8. Link Stripe session to our order
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
