import { NextResponse } from 'next/server';
import { getAuth0Client } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

// GET - Fetch a single listing for editing
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;
    const { id: listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        card: {
          select: {
            id: true,
            cardName: true,
            setName: true,
            cardNumber: true,
            variety: true,
            frontImageUrl: true,
          },
        },
        gradingCertificate: {
          select: {
            id: true,
            gradingCompany: true,
            certNumber: true,
            grade: true,
            gradeLabel: true,
            frontImageUrl: true,
          },
        },
        photos: {
          select: {
            id: true,
            publicId: true,
            url: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.sellerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error('[SellerListing][GET] Error fetching listing:', error);
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth0 = await getAuth0Client();
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

    const { displayTitle, sellerNotes, askingPriceCents, imageUrl, status, photos } = body as {
      displayTitle?: string;
      sellerNotes?: string | null;
      askingPriceCents?: number;
      imageUrl?: string | null;
      status?: 'DRAFT' | 'PUBLISHED';
      photos?: Array<{ publicId: string; url: string }>;
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

    // Validate photos if provided
    const validPhotos = Array.isArray(photos)
      ? photos.filter((p) => p && typeof p.publicId === 'string' && typeof p.url === 'string')
      : null;

    // Use a transaction if we need to update photos
    if (validPhotos !== null) {
      const updated = await prisma.$transaction(async (tx) => {
        // Update listing fields if any
        let updatedListing = existing;
        if (Object.keys(data).length > 0) {
          updatedListing = await tx.listing.update({
            where: { id: listingId },
            data,
          });
        }

        // Delete all existing photos
        await tx.listingPhoto.deleteMany({
          where: { listingId },
        });

        // Create new photos
        if (validPhotos.length > 0) {
          await tx.listingPhoto.createMany({
            data: validPhotos.map((photo, index) => ({
              listingId,
              publicId: photo.publicId,
              url: photo.url,
              sortOrder: index,
            })),
          });
        }

        // Return updated listing with photos
        return tx.listing.findUnique({
          where: { id: listingId },
          include: {
            photos: { orderBy: { sortOrder: 'asc' } },
          },
        });
      });

      return NextResponse.json({ listing: updated });
    }

    // No photos to update, just update fields
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

// DELETE - Remove a listing
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth0 = await getAuth0Client();
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
      return NextResponse.json({ error: 'Cannot delete a sold listing' }, { status: 400 });
    }

    // Delete listing (photos will cascade delete due to onDelete: Cascade in schema)
    await prisma.listing.delete({
      where: { id: listingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SellerListing][DELETE] Error deleting listing:', error);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}
