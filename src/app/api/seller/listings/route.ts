import { NextResponse } from 'next/server';
import { getAuth0Client } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { canSell } from '@/lib/seller-access';
import {
  findOrCreateCardAndCertificateFromPSACertificate,
  lookupPSACertificate,
  normalizePSACertNumber,
} from '@/lib/psa-api';

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
        // Shipping info (only populated if shipped)
        orderShippingCarrier: paidOrder?.shippingCarrier || null,
        orderTrackingNumber: paidOrder?.trackingNumber || null,
        orderFulfillmentStatus: paidOrder?.fulfillmentStatus || null,
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
      psaCertNumber,
      cardId,
      gradingCertificateId,
    } = body as {
      displayTitle?: string;
      askingPriceCents?: number;
      currency?: string;
      sellerNotes?: string;
      imageUrl?: string;
      psaCertNumber?: string;
      cardId?: string;
      gradingCertificateId?: string;
    };

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

    const listing = await prisma.listing.create({
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
        status: 'PUBLISHED', // Default to published - sellers can move to draft if needed
      },
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
            // purchasePriceCents could be set later by the user
          },
        });
      }
    }

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('[SellerListings][POST] Error creating listing:', error);

    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}
