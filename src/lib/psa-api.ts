/**
 * PSA API service and card helpers
 * - Lookup certificate data via PSA API
 * - Fetch front/back images via GetImagesByCertNumber
 * - Create/update Card records from PSA data
 */

import { prisma } from '@/lib/prisma';
import { getPSAApiBaseUrl, getPSAApiEndpoint, getPSAApiKey } from '@/lib/env';

export interface PSAApiResponse {
  Subject?: string;
  Brand?: string;
  CardNumber?: string;
  Variety?: string;
  SpecID?: number;
  CardGrade?: string | number;
  GradeDescription?: string;
  certNumber?: string;
  [key: string]: unknown;
}

export interface PSAImageResponse {
  IsFrontImage: boolean;
  ImageURL: string;
}

export interface PSALookupResult {
  success: boolean;
  data?: PSAApiResponse;
  error?: string;
  statusCode?: number;
}

export interface PSACardData {
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  variety: string | null;
  psaSpecId: number | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  imageGrade?: number | null;
}

export interface PSACertificateData {
  gradingCompany: string;
  certNumber: string;
  grade: number | null;
  gradeLabel: string | null;
  psaSpecId: number | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
}

export function normalizePSACertNumber(certNumber: string): string {
  return certNumber.trim().replace(/[\s-]/g, '');
}

export async function lookupPSACertificate(certNumber: string): Promise<PSALookupResult> {
  const apiKey = getPSAApiKey();
  const baseUrl = getPSAApiBaseUrl();

  if (!apiKey) {
    return { success: false, error: 'PSA API key not configured' };
  }

  const normalizedCertNumber = normalizePSACertNumber(certNumber);
  if (!normalizedCertNumber) {
    return { success: false, error: 'Certificate number is required' };
  }

  try {
    // PSA API endpoint: https://api.psacard.com/publicapi/cert/GetByCertNumber/{certNumber}
    const customEndpoint = getPSAApiEndpoint();
    const endpoint = customEndpoint
      ? customEndpoint.replace('{certNumber}', normalizedCertNumber)
      : `/publicapi/cert/GetByCertNumber/${normalizedCertNumber}`;
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Certificate not found', statusCode: 404 };
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      return { success: false, error: `PSA API error: ${errorText}`, statusCode: response.status };
    }

    const data = (await response.json()) as PSAApiResponse;
    if (!data.certNumber) {
      data.certNumber = normalizedCertNumber;
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export function parsePSABrand(brand?: string | null): string | null {
  if (!brand) return null;
  let parsed = brand
    .replace(/^POKEMON\s+/i, '')
    .replace(/^PFL\s+/i, '')
    .replace(/^EN-/i, '');
  parsed = parsed
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return parsed.trim() || null;
}

export function parsePSAGrade(apiResponse: PSAApiResponse): number | null {
  if (apiResponse.CardGrade !== undefined && apiResponse.CardGrade !== null) {
    const numericGrade = Number(apiResponse.CardGrade);
    if (!Number.isNaN(numericGrade)) {
      return numericGrade;
    }
  }

  if (apiResponse.GradeDescription) {
    const match = apiResponse.GradeDescription.match(/(\d+(\.\d+)?)/);
    if (match) {
      const parsed = Number(match[1]);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function extractCardDataFromPSAResponse(psaApiResponse: unknown): PSACardData | null {
  if (!psaApiResponse || typeof psaApiResponse !== 'object') {
    return null;
  }

  const response = psaApiResponse as PSAApiResponse;
  const responseRoot =
    (response as { PSACert?: PSAApiResponse }).PSACert && typeof response.PSACert === 'object'
      ? (response as { PSACert: PSAApiResponse }).PSACert
      : response;
  const cardName = responseRoot.Subject || null;
  const setName = responseRoot.Brand || null;
  const cardNumber = responseRoot.CardNumber ? String(responseRoot.CardNumber) : null;
  const variety = responseRoot.Variety || null;
  const psaSpecId = responseRoot.SpecID ? Number(responseRoot.SpecID) : null;
  const imageGrade = parsePSAGrade(responseRoot);

  if (!psaSpecId && !cardName) {
    return null;
  }

  return { cardName, setName, cardNumber, variety, psaSpecId, imageGrade };
}

export function extractCertificateDataFromPSAResponse(
  psaApiResponse: unknown,
  certNumber?: string,
): PSACertificateData | null {
  if (!psaApiResponse || typeof psaApiResponse !== 'object') {
    return null;
  }

  const response = psaApiResponse as PSAApiResponse;
  const responseRoot =
    (response as { PSACert?: PSAApiResponse }).PSACert && typeof response.PSACert === 'object'
      ? (response as { PSACert: PSAApiResponse }).PSACert
      : response;
  const normalizedCertNumber = certNumber ? normalizePSACertNumber(certNumber) : null;
  const responseCertNumber =
    (responseRoot as { CertNumber?: unknown }).CertNumber ?? responseRoot.certNumber;
  const resolvedCertNumber =
    normalizedCertNumber || (responseCertNumber ? String(responseCertNumber) : null);

  if (!resolvedCertNumber) {
    return null;
  }

  const grade = parsePSAGrade(responseRoot);

  return {
    gradingCompany: 'PSA',
    certNumber: resolvedCertNumber,
    grade,
    gradeLabel: responseRoot.GradeDescription ?? null,
    psaSpecId: responseRoot.SpecID ? Number(responseRoot.SpecID) : null,
  };
}

export async function fetchPSACertificateImages(certNumber: string): Promise<{
  frontImageUrl: string | null;
  backImageUrl: string | null;
}> {
  const normalizedCertNumber = normalizePSACertNumber(certNumber);
  if (!normalizedCertNumber) {
    return { frontImageUrl: null, backImageUrl: null };
  }

  const apiKey = getPSAApiKey();
  if (!apiKey) {
    console.warn(
      `[PSA Images] Missing PSA API key; skipping image fetch for cert ${normalizedCertNumber}`,
    );
    return { frontImageUrl: null, backImageUrl: null };
  }

  try {
    const response = await fetch(
      `https://api.psacard.com/publicapi/cert/GetImagesByCertNumber/${normalizedCertNumber}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(
        `[PSA Images] Request failed for cert ${normalizedCertNumber}: ${response.status} ${response.statusText} - ${errorText}`,
      );
      return { frontImageUrl: null, backImageUrl: null };
    }

    const images = (await response.json()) as PSAImageResponse[];
    let frontImageUrl: string | null = null;
    let backImageUrl: string | null = null;

    for (const image of images) {
      if (image.IsFrontImage) {
        frontImageUrl = image.ImageURL;
      } else {
        backImageUrl = image.ImageURL;
      }
    }

    return { frontImageUrl, backImageUrl };
  } catch {
    return { frontImageUrl: null, backImageUrl: null };
  }
}

export async function findOrCreateCardFromPSAData(
  cardData: PSACardData,
  gameType: 'POKEMON' = 'POKEMON',
): Promise<string | null> {
  if (cardData.psaSpecId) {
    const existingCard = await prisma.card.findFirst({
      where: { psaSpecId: cardData.psaSpecId },
    });

    if (existingCard) {
      const incomingHasImages = !!(cardData.frontImageUrl || cardData.backImageUrl);
      const incomingGrade = cardData.imageGrade ?? null;
      const existingGrade = existingCard.highestImageGrade ?? null;
      const shouldUpdateImages =
        incomingHasImages &&
        (existingGrade === null || (incomingGrade !== null && incomingGrade > existingGrade));

      if (shouldUpdateImages || (incomingHasImages && existingGrade === null)) {
        await prisma.card.update({
          where: { id: existingCard.id },
          data: {
            frontImageUrl: cardData.frontImageUrl ?? existingCard.frontImageUrl,
            backImageUrl: cardData.backImageUrl ?? existingCard.backImageUrl,
            highestImageGrade: incomingGrade ?? existingGrade,
          },
        });
      }
      return existingCard.id;
    }
  }

  try {
    const newCard = await prisma.card.create({
      data: {
        gameType,
        cardName: cardData.cardName,
        setName: cardData.setName,
        cardNumber: cardData.cardNumber,
        variety: cardData.variety,
        psaSpecId: cardData.psaSpecId,
        frontImageUrl: cardData.frontImageUrl ?? null,
        backImageUrl: cardData.backImageUrl ?? null,
        highestImageGrade: cardData.imageGrade ?? null,
      },
    });

    return newCard.id;
  } catch (error) {
    console.error('Error creating Card from PSA data:', error);
    return null;
  }
}

export async function findOrCreateCardFromPSACertificate(
  psaApiResponse: unknown,
  certNumber?: string,
): Promise<string | null> {
  const cardData = extractCardDataFromPSAResponse(psaApiResponse);

  if (!cardData) {
    return null;
  }

  if (certNumber) {
    const images = await fetchPSACertificateImages(certNumber);
    cardData.frontImageUrl = images.frontImageUrl;
    cardData.backImageUrl = images.backImageUrl;
  }

  return await findOrCreateCardFromPSAData(cardData);
}

export async function findOrCreateGradingCertificateFromPSA(
  psaApiResponse: unknown,
  certNumber: string,
  cardId: string | null,
  images?: { frontImageUrl: string | null; backImageUrl: string | null },
): Promise<string | null> {
  const certificateData = extractCertificateDataFromPSAResponse(psaApiResponse, certNumber);
  if (!certificateData) {
    return null;
  }

  if (images) {
    certificateData.frontImageUrl = images.frontImageUrl;
    certificateData.backImageUrl = images.backImageUrl;
  }

  try {
    const existingCertificate = await prisma.gradingCertificate.findUnique({
      where: {
        gradingCompany_certNumber: {
          gradingCompany: certificateData.gradingCompany,
          certNumber: certificateData.certNumber,
        },
      },
    });

    if (existingCertificate) {
      const shouldUpdateGrade =
        certificateData.grade !== null && existingCertificate.grade === null;
      const shouldUpdateLabel =
        certificateData.gradeLabel !== null && !existingCertificate.gradeLabel;
      const shouldUpdateCard = cardId && !existingCertificate.cardId;
      const shouldUpdateSpec =
        certificateData.psaSpecId !== null && existingCertificate.psaSpecId === null;
      const shouldUpdateFrontImage =
        certificateData.frontImageUrl && !existingCertificate.frontImageUrl;
      const shouldUpdateBackImage =
        certificateData.backImageUrl && !existingCertificate.backImageUrl;

      if (
        shouldUpdateGrade ||
        shouldUpdateLabel ||
        shouldUpdateCard ||
        shouldUpdateSpec ||
        shouldUpdateFrontImage ||
        shouldUpdateBackImage
      ) {
        await prisma.gradingCertificate.update({
          where: { id: existingCertificate.id },
          data: {
            grade: shouldUpdateGrade ? certificateData.grade : existingCertificate.grade,
            gradeLabel: shouldUpdateLabel
              ? certificateData.gradeLabel
              : existingCertificate.gradeLabel,
            cardId: shouldUpdateCard ? cardId : existingCertificate.cardId,
            psaSpecId: shouldUpdateSpec ? certificateData.psaSpecId : existingCertificate.psaSpecId,
            frontImageUrl: shouldUpdateFrontImage
              ? certificateData.frontImageUrl
              : existingCertificate.frontImageUrl,
            backImageUrl: shouldUpdateBackImage
              ? certificateData.backImageUrl
              : existingCertificate.backImageUrl,
          },
        });
      }

      return existingCertificate.id;
    }

    const created = await prisma.gradingCertificate.create({
      data: {
        gradingCompany: certificateData.gradingCompany,
        certNumber: certificateData.certNumber,
        grade: certificateData.grade,
        gradeLabel: certificateData.gradeLabel,
        psaSpecId: certificateData.psaSpecId,
        cardId,
        frontImageUrl: certificateData.frontImageUrl ?? null,
        backImageUrl: certificateData.backImageUrl ?? null,
      },
    });

    return created.id;
  } catch (error) {
    console.error('Error creating GradingCertificate from PSA data:', error);
    return null;
  }
}

export async function findOrCreateCardAndCertificateFromPSACertificate(
  psaApiResponse: unknown,
  certNumber?: string,
): Promise<{ cardId: string | null; certificateId: string | null }> {
  const cardData = extractCardDataFromPSAResponse(psaApiResponse);
  if (!cardData) {
    return { cardId: null, certificateId: null };
  }

  const resolvedCertNumber = certNumber ? normalizePSACertNumber(certNumber) : null;

  const images = resolvedCertNumber
    ? await fetchPSACertificateImages(resolvedCertNumber)
    : { frontImageUrl: null, backImageUrl: null };

  if (resolvedCertNumber) {
    cardData.frontImageUrl = images.frontImageUrl;
    cardData.backImageUrl = images.backImageUrl;
  }

  const cardId = await findOrCreateCardFromPSAData(cardData);
  if (!cardId || !resolvedCertNumber) {
    return { cardId, certificateId: null };
  }

  const certificateId = await findOrCreateGradingCertificateFromPSA(
    psaApiResponse,
    resolvedCertNumber,
    cardId,
    images,
  );

  return { cardId, certificateId };
}
