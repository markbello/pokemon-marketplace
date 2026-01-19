import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  findOrCreateCardAndCertificateFromPSACertificate,
  fetchPSACertificateImages,
  lookupPSACertificate,
  normalizePSACertNumber,
} from '@/lib/psa-api';

async function handleLookup(certNumberRaw: string | null) {
  if (!certNumberRaw) {
    return NextResponse.json({ error: 'certNumber is required' }, { status: 400 });
  }

  const certNumber = normalizePSACertNumber(certNumberRaw);
  if (!certNumber) {
    return NextResponse.json({ error: 'certNumber is required' }, { status: 400 });
  }

  const lookupResult = await lookupPSACertificate(certNumber);
  if (!lookupResult.success || !lookupResult.data) {
    return NextResponse.json(
      { error: lookupResult.error || 'Failed to lookup certificate' },
      { status: lookupResult.statusCode ?? 500 },
    );
  }

  const { cardId, certificateId } = await findOrCreateCardAndCertificateFromPSACertificate(
    lookupResult.data,
    certNumber,
  );
  let card = cardId
    ? await prisma.card.findUnique({
        where: { id: cardId },
      })
    : null;
  let certificate = certificateId
    ? await prisma.gradingCertificate.findUnique({
        where: { id: certificateId },
      })
    : null;

  const needsImages =
    certNumber &&
    ((card && (!card.frontImageUrl || !card.backImageUrl)) ||
      (certificate && (!certificate.frontImageUrl || !certificate.backImageUrl)));

  if (needsImages) {
    const images = await fetchPSACertificateImages(certNumber);
    if (images.frontImageUrl || images.backImageUrl) {
      const updates: Array<Promise<unknown>> = [];
      if (cardId && card) {
        updates.push(
          prisma.card.update({
            where: { id: cardId },
            data: {
              frontImageUrl: images.frontImageUrl ?? card.frontImageUrl,
              backImageUrl: images.backImageUrl ?? card.backImageUrl,
            },
          }),
        );
      }

      if (certificateId && certificate) {
        updates.push(
          prisma.gradingCertificate.update({
            where: { id: certificateId },
            data: {
              frontImageUrl: images.frontImageUrl ?? certificate.frontImageUrl,
              backImageUrl: images.backImageUrl ?? certificate.backImageUrl,
            },
          }),
        );
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        card = cardId
          ? await prisma.card.findUnique({
              where: { id: cardId },
            })
          : card;
        certificate = certificateId
          ? await prisma.gradingCertificate.findUnique({
              where: { id: certificateId },
            })
          : certificate;
      }
    }
  }

  return NextResponse.json({
    success: true,
    psaData: lookupResult.data,
    cardId,
    card,
    certificateId,
    certificate,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const certNumberRaw = searchParams.get('certNumber');
    return await handleLookup(certNumberRaw);
  } catch (error) {
    console.error('[PSA Lookup][GET] Error:', error);
    return NextResponse.json({ error: 'Failed to lookup PSA certificate' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const certNumberRaw = typeof body?.certNumber === 'string' ? body.certNumber : null;
    return await handleLookup(certNumberRaw);
  } catch (error) {
    console.error('[PSA Lookup][POST] Error:', error);
    return NextResponse.json({ error: 'Failed to lookup PSA certificate' }, { status: 500 });
  }
}
