import { NextResponse } from 'next/server';
import { getAuth0Client } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { canSell } from '@/lib/seller-access';

export async function GET() {
  try {
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;

    // Fetch listings with associated orders for sold items
    const listings = await prisma.listing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        // Include the order that purchased this listing (for SOLD items)
        orders: {
          where: { status: 'PAID' },
          select: {
            id: true,
            status: true,
            totalCents: true,
            currency: true,
            createdAt: true,
            buyer: {
              select: {
                displayName: true,
              },
            },
          },
          take: 1, // Single-item listings only have one order
        },
      },
    });

    // Transform to include soldAt and orderId for convenience
    const listingsWithSaleInfo = listings.map((listing) => {
      const paidOrder = listing.orders[0];
      return {
        ...listing,
        orders: undefined, // Remove the raw orders array
        // Sale info (only populated if SOLD)
        soldAt: paidOrder?.createdAt || null,
        orderId: paidOrder?.id || null,
        buyerName: paidOrder?.buyer?.displayName || null,
        saleTotalCents: paidOrder?.totalCents || null,
      };
    });

    return NextResponse.json({ listings: listingsWithSaleInfo });
  } catch (error) {
    console.error('[SellerListings][GET] Error fetching listings:', error);

    return NextResponse.json({ error: 'Failed to load listings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;

    // Ensure user is allowed to sell (Stripe Connect account verified)
    const allowedToSell = await canSell(userId);
    if (!allowedToSell) {
      return NextResponse.json(
        { error: 'Seller account is not verified. Complete onboarding before creating listings.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const {
      displayTitle,
      askingPriceCents,
      currency = 'USD',
      sellerNotes,
      imageUrl,
    } = body as {
      displayTitle?: string;
      askingPriceCents?: number;
      currency?: string;
      sellerNotes?: string;
      imageUrl?: string;
    };

    if (!displayTitle || typeof displayTitle !== 'string') {
      return NextResponse.json({ error: 'displayTitle is required' }, { status: 400 });
    }

    if (
      askingPriceCents === undefined ||
      typeof askingPriceCents !== 'number' ||
      !Number.isInteger(askingPriceCents) ||
      askingPriceCents < 0
    ) {
      return NextResponse.json(
        { error: 'askingPriceCents must be a non-negative integer (in cents)' },
        { status: 400 },
      );
    }

    if (typeof currency !== 'string' || !currency.trim()) {
      return NextResponse.json({ error: 'currency must be a non-empty string' }, { status: 400 });
    }

    const listing = await prisma.listing.create({
      data: {
        sellerId: userId,
        displayTitle: displayTitle.trim(),
        askingPriceCents,
        currency: currency.trim().toUpperCase(),
        sellerNotes: sellerNotes?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        status: 'PUBLISHED', // Default to published - sellers can move to draft if needed
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('[SellerListings][POST] Error creating listing:', error);

    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}
