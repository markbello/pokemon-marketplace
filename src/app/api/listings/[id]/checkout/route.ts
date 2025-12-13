import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAuth0Client } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { getBaseUrl } from '@/lib/server-utils';
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer';
import { getOrCreateUser, getPreferredEmail } from '@/lib/user';
import { logAuditEvent } from '@/lib/audit';
import { getStripeClient } from '@/lib/stripe-client';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const stripe = await getStripeClient();
    const headersList = await headers();
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const buyerId = session.user.sub;
    const ipAddress =
      headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    const body = await request.json().catch(() => ({}));
    const providedEmail =
      typeof body.emailOverride === 'string' ? body.emailOverride.trim() : undefined;

    const purchaseTimezone = body.timezone || undefined;

    const { id: listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { seller: true },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Listing is not available for purchase' }, { status: 400 });
    }

    if (listing.sellerId === buyerId) {
      return NextResponse.json({ error: 'You cannot purchase your own listing' }, { status: 400 });
    }

    // Ensure we have a user record for the buyer in our DB
    const buyer = await getOrCreateUser(buyerId);
    const buyerEmail = getPreferredEmail(buyer, session.user.email || providedEmail);

    if (!buyerEmail) {
      return NextResponse.json(
        { error: 'User email required', code: 'EMAIL_REQUIRED' },
        { status: 428 },
      );
    }

    // Create Order as a pending listing-based purchase
    // subtotalCents = item price, totalCents = same initially (webhook updates with tax/shipping)
    const order = await prisma.order.create({
      data: {
        buyerId,
        sellerId: listing.sellerId,
        sellerName: listing.seller.displayName || null,
        description: `Listing purchase - ${listing.displayTitle}`,
        subtotalCents: listing.askingPriceCents,
        totalCents: listing.askingPriceCents, // Updated by webhook with actual amount
        currency: listing.currency,
        status: 'PENDING',
        isTestPayment: true, // still in test mode for PM-33
        purchaseTimezone,
        listingId: listing.id,
        snapshotListingDisplayTitle: listing.displayTitle,
        snapshotListingImageUrl: listing.imageUrl,
        snapshotListingPriceCents: listing.askingPriceCents,
      },
    });

    await logAuditEvent({
      entityType: 'Order',
      entityId: order.id,
      action: 'CREATE',
      userId: buyerId,
      ipAddress,
      userAgent,
      changes: {
        orderId: order.id,
        listingId: listing.id,
        subtotalCents: order.subtotalCents,
      },
    });

    const customerId = await getOrCreateStripeCustomer(
      buyerId,
      buyerEmail,
      buyer.displayName || session.user.name || undefined,
    );

    const baseUrl = await getBaseUrl();
    const sellerSegment = encodeURIComponent(listing.sellerId);
    const successUrl = `${baseUrl}/listings/${listing.id}/purchase/success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/seller/${sellerSegment}/listings`;

    console.log('[ListingCheckout] baseUrl:', baseUrl);
    console.log('[ListingCheckout] success_url:', successUrl);
    console.log('[ListingCheckout] cancel_url:', cancelUrl);

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: listing.currency.toLowerCase(),
            product_data: {
              name: listing.displayTitle,
              // Tax code for general merchandise (trading cards)
              tax_code: 'txcd_99999999',
            },
            unit_amount: listing.askingPriceCents,
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
        description: `Listing purchase - ${listing.displayTitle}`,
        metadata: {
          orderId: order.id,
          buyerId,
          listingId: listing.id,
        },
      },
      metadata: {
        orderId: order.id,
        buyerId,
        listingId: listing.id,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[ListingCheckout] Error creating checkout session:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: `Stripe error: ${error.message}` }, { status: 500 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Failed to create listing checkout session' },
      { status: 500 },
    );
  }
}
