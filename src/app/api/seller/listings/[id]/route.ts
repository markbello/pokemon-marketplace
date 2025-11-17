import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;
    const { id: listingId } = await params;

    const existing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existing.sellerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (existing.status === 'SOLD') {
      return NextResponse.json({ error: 'Cannot modify a sold listing' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    const { displayTitle, sellerNotes, askingPriceCents, imageUrl, status } = body as {
      displayTitle?: string;
      sellerNotes?: string | null;
      askingPriceCents?: number;
      imageUrl?: string | null;
      status?: 'DRAFT' | 'PUBLISHED';
    };

    const data: Record<string, unknown> = {};

    if (displayTitle !== undefined) {
      if (!displayTitle || typeof displayTitle !== 'string') {
        return NextResponse.json(
          { error: 'displayTitle must be a non-empty string' },
          { status: 400 },
        );
      }
      data.displayTitle = displayTitle.trim();
    }

    if (sellerNotes !== undefined) {
      if (sellerNotes === null || sellerNotes === '') {
        data.sellerNotes = null;
      } else if (typeof sellerNotes === 'string') {
        data.sellerNotes = sellerNotes.trim();
      } else {
        return NextResponse.json(
          { error: 'sellerNotes must be a string or null' },
          { status: 400 },
        );
      }
    }

    if (askingPriceCents !== undefined) {
      if (
        typeof askingPriceCents !== 'number' ||
        !Number.isInteger(askingPriceCents) ||
        askingPriceCents < 0
      ) {
        return NextResponse.json(
          { error: 'askingPriceCents must be a non-negative integer (in cents)' },
          { status: 400 },
        );
      }
      data.askingPriceCents = askingPriceCents;
    }

    if (imageUrl !== undefined) {
      if (imageUrl === null || imageUrl === '') {
        data.imageUrl = null;
      } else if (typeof imageUrl === 'string') {
        data.imageUrl = imageUrl.trim();
      } else {
        return NextResponse.json({ error: 'imageUrl must be a string or null' }, { status: 400 });
      }
    }

    if (status !== undefined) {
      if (status !== 'DRAFT' && status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'status must be DRAFT or PUBLISHED' }, { status: 400 });
      }
      data.status = status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data,
    });

    return NextResponse.json({ listing: updated });
  } catch (error) {
    console.error('[SellerListing][PATCH] Error updating listing:', error);

    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}
