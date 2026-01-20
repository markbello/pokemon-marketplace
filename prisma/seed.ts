import { PrismaClient } from '@prisma/client';
import { access, readFile } from 'fs/promises';
import path from 'path';
import { processPSASalesData } from '@/lib/sales-data-processor';
import { extractCardDataFromPSAResponse, normalizePSACertNumber } from '@/lib/psa-api';

const prisma = new PrismaClient();

const USERS_SEED_PATH = path.join(__dirname, 'seed-users.json');
const INVITES_SEED_PATH = path.join(__dirname, 'seed-invitation-codes.json');
const SALES_DATA_PATH = path.join(__dirname, 'seed-sales-data.json');
const CERT_IMAGES_PATH = path.join(__dirname, 'seed-certificate-images.json');

async function seedUsersAndInvitations() {
  const users = JSON.parse(await readFile(USERS_SEED_PATH, 'utf8')) as Array<
    Record<string, string | null>
  >;
  const invitationCodes = JSON.parse(await readFile(INVITES_SEED_PATH, 'utf8')) as Array<
    Record<string, string | null>
  >;

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id as string },
      update: {
        displayName: user.displayName ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        stripeCustomerId: user.stripeCustomerId ?? undefined,
        stripeAccountId: user.stripeAccountId ?? undefined,
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
      },
      create: {
        id: user.id as string,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        stripeCustomerId: user.stripeCustomerId,
        stripeAccountId: user.stripeAccountId,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
      },
    });
  }

  for (const invite of invitationCodes) {
    await prisma.invitationCode.upsert({
      where: { id: invite.id as string },
      update: {
        code: invite.code as string,
        createdBy: invite.createdBy ?? undefined,
        usedBy: invite.usedBy ?? undefined,
        usedAt: invite.usedAt ? new Date(invite.usedAt) : undefined,
      },
      create: {
        id: invite.id as string,
        code: invite.code as string,
        createdBy: invite.createdBy,
        usedBy: invite.usedBy,
        usedAt: invite.usedAt ? new Date(invite.usedAt) : null,
        createdAt: invite.createdAt ? new Date(invite.createdAt) : new Date(),
      },
    });
  }
}

type SeedSalesDataEntry = {
  image: string | null;
  title: string | null;
  is_auction: boolean;
  value: number;
  date: string;
  cert_number: string | null;
  psa_api_response: unknown;
};

type SeedCertificateImages = Record<
  string,
  { frontImageUrl: string | null; backImageUrl: string | null }
>;

async function loadCertificateImagesSeed(): Promise<SeedCertificateImages | null> {
  try {
    await access(CERT_IMAGES_PATH);
    const raw = await readFile(CERT_IMAGES_PATH, 'utf8');
    return JSON.parse(raw) as SeedCertificateImages;
  } catch {
    return null;
  }
}

async function seedSalesData() {
  const raw = await readFile(SALES_DATA_PATH, 'utf8');
  const salesData = JSON.parse(raw) as SeedSalesDataEntry[];
  const certificateImages = await loadCertificateImagesSeed();

  for (const entry of salesData) {
    const normalizedCertNumber = entry.cert_number
      ? normalizePSACertNumber(entry.cert_number)
      : null;
    await processPSASalesData({
      certNumber: entry.cert_number ?? undefined,
      value: entry.value,
      date: new Date(entry.date),
      isAuction: entry.is_auction,
      imageUrl: entry.image ?? undefined,
      title: entry.title ?? undefined,
      psaApiResponse: entry.psa_api_response,
      source: 'seed-sales-data',
      sourceId: entry.cert_number ?? undefined,
      certificateImages:
        normalizedCertNumber && certificateImages
          ? certificateImages[normalizedCertNumber]
          : undefined,
      skipImageFetch: true,
    });
  }
}

async function backfillCardImagesFromSalesData() {
  const certificateImages = await loadCertificateImagesSeed();
  if (!certificateImages) {
    return;
  }

  const cardsNeedingImages = await prisma.card.findMany({
    where: {
      OR: [{ frontImageUrl: null }, { backImageUrl: null }],
    },
    select: {
      id: true,
      frontImageUrl: true,
      backImageUrl: true,
      highestImageGrade: true,
    },
  });

  for (const card of cardsNeedingImages) {
    const salesData = await prisma.salesData.findFirst({
      where: {
        cardId: card.id,
        certNumber: { not: null },
      },
      select: { certNumber: true, apiResponse: true },
      orderBy: { date: 'desc' },
    });

    if (!salesData?.certNumber) {
      continue;
    }

    const cardData = extractCardDataFromPSAResponse(salesData.apiResponse);
    const incomingGrade = cardData?.imageGrade ?? null;

    const normalizedCertNumber = normalizePSACertNumber(salesData.certNumber);
    if (!normalizedCertNumber) {
      continue;
    }

    const images = certificateImages[normalizedCertNumber];
    if (!images || (!images.frontImageUrl && !images.backImageUrl)) {
      continue;
    }

    const shouldUpdateGrade =
      incomingGrade !== null &&
      (card.highestImageGrade === null || incomingGrade > card.highestImageGrade);

    await prisma.card.update({
      where: { id: card.id },
      data: {
        frontImageUrl: images.frontImageUrl ?? card.frontImageUrl,
        backImageUrl: images.backImageUrl ?? card.backImageUrl,
        highestImageGrade: shouldUpdateGrade ? incomingGrade : card.highestImageGrade,
      },
    });
  }
}

async function main() {
  await seedUsersAndInvitations();
  await seedSalesData();
  await backfillCardImagesFromSalesData();

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
