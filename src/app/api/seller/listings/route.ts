import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { canSell } from '@/lib/seller-access';

export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;

    const listings = await prisma.listing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('[SellerListings][GET] Error fetching listings:', error);

    return NextResponse.json(
      { error: 'Failed to load listings' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
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
      return NextResponse.json(
        { error: 'displayTitle is required' },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: 'currency must be a non-empty string' },
        { status: 400 },
      );
    }

    const listing = await prisma.listing.create({
      data: {
        sellerId: userId,
        displayTitle: displayTitle.trim(),
        askingPriceCents,
        currency: currency.trim().toUpperCase(),
        sellerNotes: sellerNotes?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('[SellerListings][POST] Error creating listing:', error);

    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 },
    );
  }
}


