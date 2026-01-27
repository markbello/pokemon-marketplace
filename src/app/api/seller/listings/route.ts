import { NextResponse } from 'next/server';
import { getAuth0Client } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { canSell } from '@/lib/seller-access';
import {
  findOrCreateCardAndCertificateFromPSACertificate,
  lookupPSACertificate,
  normalizePSACertNumber,
} from '@/lib/psa-api';
import type { ListingStatus, Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // 'ALL', 'LIVE', 'DRAFT', 'PUBLISHED', 'SOLD'
    const sortOrder = searchParams.get('sort') === 'oldest' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ListingWhereInput = { sellerId: userId };
    if (statusFilter && statusFilter !== 'ALL') {
      // Map 'LIVE' to 'PUBLISHED' for user-friendly API
      const dbStatus = statusFilter === 'LIVE' ? 'PUBLISHED' : statusFilter;
      if (['DRAFT', 'PUBLISHED', 'SOLD'].includes(dbStatus)) {
        where.status = dbStatus as ListingStatus;
      }
    }

    // Fetch total count for pagination
    const totalCount = await prisma.listing.count({ where });

    // Fetch listings with associated orders for sold items
    const listings = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
      include: {
        // Include card details for display
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
        // Include grading certificate for grade info
        gradingCertificate: {
          select: {
            id: true,
            gradingCompany: true,
            certNumber: true,
            grade: true,
            gradeLabel: true,
          },
        },
        // Include photos for image count
        photos: {
          select: {
            id: true,
            url: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        // Include the order that purchased this listing (for SOLD items)
        orders: {
          where: { status: 'PAID' },
          select: {
            id: true,
            status: true,
            totalCents: true,
            currency: true,
            createdAt: true,
            shippingCarrier: true,
            trackingNumber: true,
            fulfillmentStatus: true,
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
    const listingsWithSaleInfo = listings.map((listing, index) => {
      const paidOrder = listing.orders[0];
      // Count additional images (photos beyond the main image)
      const photoCount = listing.photos?.length || 0;
      return {
        ...listing,
        orders: undefined, // Remove the raw orders array
        photos: undefined, // Remove the raw photos array
        // Index for display (1-based, accounting for pagination)
        displayIndex: skip + index + 1,
        // Photo count for "+N" badge (additional images beyond the main one)
        additionalImageCount: photoCount > 0 ? photoCount : 0,
        // Sale info (only populated if SOLD)
        soldAt: paidOrder?.createdAt || null,
        orderId: paidOrder?.id || null,
        buyerName: paidOrder?.buyer?.displayName || null,
        saleTotalCents: paidOrder?.totalCents || null,
        // Shipping info (only populated if shipped)
        orderShippingCarrier: paidOrder?.shippingCarrier || null,
        orderTrackingNumber: paidOrder?.trackingNumber || null,
        orderFulfillmentStatus: paidOrder?.fulfillmentStatus || null,
      };
    });

    return NextResponse.json({
      listings: listingsWithSaleInfo,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    });
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
      psaCertNumber,
      cardId,
      gradingCertificateId,
      slabCondition,
      status: requestedStatus,
      photos,
    } = body as {
      displayTitle?: string;
      askingPriceCents?: number;
      currency?: string;
      sellerNotes?: string;
      imageUrl?: string;
      psaCertNumber?: string;
      cardId?: string;
      gradingCertificateId?: string;
      slabCondition?: 'MINT' | 'NEAR_MINT' | 'GOOD' | 'DAMAGED' | 'UNKNOWN';
      status?: 'DRAFT' | 'PUBLISHED';
      photos?: Array<{ publicId: string; url: string }>;
    };

    // Determine if this is a draft save
    const isDraft = requestedStatus === 'DRAFT';

    // Validate slab condition (required for PUBLISHED, optional for DRAFT)
    const validSlabConditions = ['MINT', 'NEAR_MINT', 'GOOD', 'DAMAGED', 'UNKNOWN'];
    if (!isDraft && (!slabCondition || !validSlabConditions.includes(slabCondition))) {
      return NextResponse.json(
        { error: 'slabCondition is required and must be one of: MINT, NEAR_MINT, GOOD, DAMAGED' },
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
      return NextResponse.json({ error: 'currency must be a non-empty string' }, { status: 400 });
    }

    let resolvedCardId = cardId || null;
    let resolvedCertificateId: string | null = gradingCertificateId || null;
    let resolvedCertNumber = psaCertNumber?.trim() || null;
    let resolvedImageUrl = imageUrl?.trim() || null;
    let resolvedDisplayTitle =
      typeof displayTitle === 'string' && displayTitle.trim() ? displayTitle.trim() : null;

    if (resolvedCertificateId) {
      const certificate = await prisma.gradingCertificate.findUnique({
        where: { id: resolvedCertificateId },
      });

      if (!certificate) {
        return NextResponse.json({ error: 'gradingCertificateId is invalid' }, { status: 400 });
      }

      resolvedCardId = resolvedCardId || certificate.cardId;
      resolvedCertNumber = resolvedCertNumber || certificate.certNumber;
      resolvedImageUrl = resolvedImageUrl || certificate.frontImageUrl;
    }

    if (!resolvedCertNumber) {
      return NextResponse.json({ error: 'psaCertNumber is required' }, { status: 400 });
    }

    if (resolvedCertNumber) {
      const normalizedCertNumber = normalizePSACertNumber(resolvedCertNumber);
      if (!resolvedCertificateId && normalizedCertNumber) {
        const existingCertificate = await prisma.gradingCertificate.findUnique({
          where: {
            gradingCompany_certNumber: {
              gradingCompany: 'PSA',
              certNumber: normalizedCertNumber,
            },
          },
        });

        if (existingCertificate) {
          resolvedCertificateId = existingCertificate.id;
          resolvedCardId = resolvedCardId || existingCertificate.cardId;
          resolvedImageUrl = resolvedImageUrl || existingCertificate.frontImageUrl;
        }
      }

      if (resolvedCardId) {
        resolvedCertNumber = normalizedCertNumber;
      }

      if (!resolvedCardId || !resolvedCertificateId) {
        const lookupResult = await lookupPSACertificate(normalizedCertNumber);

        if (!lookupResult.success || !lookupResult.data) {
          return NextResponse.json(
            { error: lookupResult.error || 'Failed to lookup PSA certificate' },
            { status: lookupResult.statusCode ?? 500 },
          );
        }

        if (!resolvedDisplayTitle) {
          const subject = lookupResult.data.Subject || 'PSA Card';
          const variety = lookupResult.data.Variety ? ` - ${lookupResult.data.Variety}` : '';
          const cardNumber = lookupResult.data.CardNumber
            ? ` #${lookupResult.data.CardNumber}`
            : '';
          const brand = lookupResult.data.Brand ? ` (${lookupResult.data.Brand})` : '';
          resolvedDisplayTitle = `${subject}${variety}${cardNumber}${brand}`;
        }

        const { cardId: createdCardId, certificateId } =
          await findOrCreateCardAndCertificateFromPSACertificate(
            lookupResult.data,
            normalizedCertNumber,
          );

        if (!createdCardId) {
          return NextResponse.json(
            { error: 'Failed to create card from PSA certificate' },
            { status: 500 },
          );
        }

        resolvedCardId = createdCardId;
        resolvedCertificateId = certificateId;
        resolvedCertNumber = normalizedCertNumber;
      }
    }

    if (!resolvedImageUrl && resolvedCardId) {
      const card = await prisma.card.findUnique({
        where: { id: resolvedCardId },
        select: { frontImageUrl: true },
      });
      resolvedImageUrl = card?.frontImageUrl ?? null;
    }

    // Determine the listing status
    const listingStatus = isDraft ? 'DRAFT' : 'PUBLISHED';

    // Validate photos if provided
    const validPhotos = Array.isArray(photos)
      ? photos.filter((p) => p && typeof p.publicId === 'string' && typeof p.url === 'string')
      : [];

    // Create listing with photos in a transaction
    const listing = await prisma.$transaction(async (tx) => {
      const newListing = await tx.listing.create({
        data: {
          sellerId: userId,
          displayTitle: resolvedDisplayTitle || 'PSA Card',
          askingPriceCents,
          currency: currency.trim().toUpperCase(),
          sellerNotes: sellerNotes?.trim() || null,
          imageUrl: resolvedImageUrl,
          cardId: resolvedCardId,
          psaCertNumber: resolvedCertNumber,
          gradingCertificateId: resolvedCertificateId,
          slabCondition:
            slabCondition && validSlabConditions.includes(slabCondition)
              ? (slabCondition as 'MINT' | 'NEAR_MINT' | 'GOOD' | 'DAMAGED')
              : null,
          status: listingStatus,
        },
      });

      // Create listing photos if any
      if (validPhotos.length > 0) {
        await tx.listingPhoto.createMany({
          data: validPhotos.map((photo, index) => ({
            listingId: newListing.id,
            publicId: photo.publicId,
            url: photo.url,
            sortOrder: index,
          })),
        });
      }

      // Return listing with photos
      return tx.listing.findUnique({
        where: { id: newListing.id },
        include: { photos: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    // Auto-add to collection if not already there
    // If you're listing a card for sale, you own it - so it should be in your collection
    if (resolvedCardId && resolvedCertificateId) {
      const existingCollectionItem = await prisma.collectionItem.findFirst({
        where: {
          userId,
          gradingCertificateId: resolvedCertificateId,
          removedAt: null, // Only check active items
        },
      });

      if (!existingCollectionItem) {
        await prisma.collectionItem.create({
          data: {
            userId,
            cardId: resolvedCardId,
            gradingCertificateId: resolvedCertificateId,
            slabCondition,
            // purchasePriceCents could be set later by the user
          },
        });
      } else if (existingCollectionItem.slabCondition !== slabCondition) {
        // Update slab condition if it changed
        await prisma.collectionItem.update({
          where: { id: existingCollectionItem.id },
          data: { slabCondition },
        });
      }
    }

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('[SellerListings][POST] Error creating listing:', error);

    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}
