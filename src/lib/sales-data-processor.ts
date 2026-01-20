/**
 * PM-90: Sales data processor
 *
 * Processes sales data from grading APIs (PSA, TAG, etc.) and creates Card records organically.
 * PSA API logic lives in src/lib/psa-api.ts to keep responsibilities separate.
 */

import { prisma } from '@/lib/prisma';
import {
  extractCardDataFromPSAResponse,
  fetchPSACertificateImages,
  findOrCreateGradingCertificateFromPSA,
  findOrCreateCardFromPSAData,
  normalizePSACertNumber,
} from '@/lib/psa-api';

/**
 * Process PSA sales data and create/update Card and SalesData records
 * This is the main function to call when processing new sales data
 */
export async function processPSASalesData(params: {
  certNumber?: string;
  value: number;
  date: Date;
  isAuction?: boolean;
  imageUrl?: string;
  title?: string;
  psaApiResponse: unknown;
  source?: string;
  sourceId?: string;
  certificateImages?: { frontImageUrl: string | null; backImageUrl: string | null };
  skipImageFetch?: boolean;
}): Promise<{ cardId: string | null; salesDataId: string | null }> {
  // Extract card data from PSA API response
  const cardData = extractCardDataFromPSAResponse(params.psaApiResponse);

  if (!cardData) {
    console.warn('Could not extract card data from PSA API response');
    return { cardId: null, salesDataId: null };
  }

  // If we have a cert number, fetch PSA images and attach to card data
  const certNumber =
    params.certNumber ||
    (typeof (params.psaApiResponse as { certNumber?: unknown })?.certNumber === 'string'
      ? String((params.psaApiResponse as { certNumber?: unknown }).certNumber)
      : undefined);

  let certImages: { frontImageUrl: string | null; backImageUrl: string | null } | undefined =
    params.certificateImages;

  if (!certImages && certNumber && !params.skipImageFetch) {
    const normalizedCertNumber = normalizePSACertNumber(certNumber);
    if (normalizedCertNumber) {
      const images = await fetchPSACertificateImages(normalizedCertNumber);
      cardData.frontImageUrl = images.frontImageUrl;
      cardData.backImageUrl = images.backImageUrl;
      certImages = images;
    }
  }

  if (certImages) {
    cardData.frontImageUrl = certImages.frontImageUrl;
    cardData.backImageUrl = certImages.backImageUrl;
  }

  // Find or create Card record (images will be stored on the card)
  const cardId = await findOrCreateCardFromPSAData(cardData);

  if (!cardId) {
    console.error('Failed to find or create Card record');
    return { cardId: null, salesDataId: null };
  }

  // Create or update certificate instance for this sale
  const certificateId =
    certNumber && cardId
      ? await findOrCreateGradingCertificateFromPSA(
          params.psaApiResponse,
          certNumber,
          cardId,
          certImages,
        )
      : null;

  // Create SalesData record
  try {
    const salesData = await prisma.salesData.create({
      data: {
        cardId,
        gradingCertificateId: certificateId,
        gradingCompany: 'PSA',
        certNumber: params.certNumber || null,
        value: params.value,
        date: params.date,
        isAuction: params.isAuction || false,
        imageUrl: params.imageUrl || null,
        title: params.title || null,
        apiResponse: params.psaApiResponse as object,
        source: params.source || null,
        sourceId: params.sourceId || null,
      },
    });

    return { cardId, salesDataId: salesData.id };
  } catch (error) {
    console.error('Error creating SalesData:', error);
    return { cardId, salesDataId: null };
  }
}

/**
 * Process sales data from other grading companies (TAG, etc.)
 * Similar to processPSASalesData but for other companies
 */
export async function processSalesData(params: {
  gradingCompany: string;
  certNumber?: string;
  value: number;
  date: Date;
  isAuction?: boolean;
  imageUrl?: string;
  title?: string;
  apiResponse: unknown;
  source?: string;
  sourceId?: string;
  // Card identification fields (company-specific)
  cardName?: string;
  setName?: string;
  cardNumber?: string;
  variety?: string;
  specId?: number;
}): Promise<{ cardId: string | null; salesDataId: string | null }> {
  // For now, we'll create Card records directly from provided fields
  // In the future, we can add company-specific extraction logic

  let cardId: string | null = null;

  // Try to find existing Card by specId if provided
  if (params.specId) {
    const existingCard = await prisma.card.findFirst({
      where: {
        psaSpecId: params.specId, // Note: This assumes specId maps to psaSpecId for now
        // TODO: Add company-specific spec ID fields in the future
      },
    });

    if (existingCard) {
      cardId = existingCard.id;
    }
  }

  // Create new Card if not found
  if (!cardId) {
    try {
      const newCard = await prisma.card.create({
        data: {
          gameType: 'POKEMON', // TODO: Make this configurable
          cardName: params.cardName || null,
          setName: params.setName || null,
          cardNumber: params.cardNumber || null,
          variety: params.variety || null,
          psaSpecId: params.specId || null,
        },
      });
      cardId = newCard.id;
    } catch (error) {
      console.error('Error creating Card:', error);
      return { cardId: null, salesDataId: null };
    }
  }

  // Create SalesData record
  try {
    const certificateId = params.certNumber
      ? (
          await prisma.gradingCertificate.upsert({
            where: {
              gradingCompany_certNumber: {
                gradingCompany: params.gradingCompany,
                certNumber: params.certNumber,
              },
            },
            update: {
              cardId,
            },
            create: {
              gradingCompany: params.gradingCompany,
              certNumber: params.certNumber,
              cardId,
              psaSpecId: params.specId ?? null,
            },
            select: { id: true },
          })
        ).id
      : null;

    const salesData = await prisma.salesData.create({
      data: {
        cardId,
        gradingCertificateId: certificateId,
        gradingCompany: params.gradingCompany,
        certNumber: params.certNumber || null,
        value: params.value,
        date: params.date,
        isAuction: params.isAuction || false,
        imageUrl: params.imageUrl || null,
        title: params.title || null,
        apiResponse: params.apiResponse as object,
        source: params.source || null,
        sourceId: params.sourceId || null,
      },
    });

    return { cardId, salesDataId: salesData.id };
  } catch (error) {
    console.error('Error creating SalesData:', error);
    return { cardId, salesDataId: null };
  }
}
