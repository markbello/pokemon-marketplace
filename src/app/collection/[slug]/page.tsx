import { notFound } from 'next/navigation';
import { getAuth0Client } from '@/lib/auth0';
import { getManagementClient } from '@/lib/auth0-management';
import { prisma } from '@/lib/prisma';
import { FEATURE_FLAGS, getEnabledFeatureFlags } from '@/lib/feature-flags';
import { CollectionPageClient } from './CollectionPageClient';

export const dynamic = 'force-dynamic';

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { slug: rawSlug } = await params;
  // Decode URL-encoded characters (e.g., auth0%7C123 -> auth0|123)
  const slug = decodeURIComponent(rawSlug);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const enabledFlags = getEnabledFeatureFlags(resolvedSearchParams);
  const useMockData = enabledFlags.has(FEATURE_FLAGS.MOCK_COLLECTION_DATA);

  // Get current user session
  const auth0 = await getAuth0Client();
  const session = await auth0.getSession();
  const currentUserId = session?.user?.sub;

  // Find the user by slug
  const profileUser = await prisma.user.findFirst({
    where: {
      OR: [
        { slug: slug },
        { id: slug }, // Fallback to id if no slug match
      ],
    },
    select: {
      id: true,
      slug: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  if (!profileUser) {
    notFound();
  }

  const isOwner = currentUserId === profileUser.id;

  // For owner viewing their own collection, sync avatar from Auth0 to ensure it's fresh
  // This handles the case where DB is stale but Auth0 has the latest avatar
  let avatarUrl = profileUser.avatarUrl;
  if (isOwner && currentUserId) {
    try {
      const management = getManagementClient();
      const response = await management.users.get({ id: currentUserId });
      const userData = response.data?.data || response.data || response;
      const userMetadata = userData.user_metadata || {};
      
      // Get avatar URL from Auth0
      const freshAvatarUrl = userMetadata.avatar?.secure_url || userData.picture || null;
      const freshDisplayName = userMetadata.displayName || null;
      
      // Sync to database
      if (freshAvatarUrl !== profileUser.avatarUrl || freshDisplayName !== profileUser.displayName) {
        await prisma.user.update({
          where: { id: currentUserId },
          data: { 
            avatarUrl: freshAvatarUrl,
            displayName: freshDisplayName,
          },
        });
      }
      
      avatarUrl = freshAvatarUrl;
    } catch (error) {
      // Fall back to database avatarUrl if Auth0 fetch fails
      console.error('Failed to sync avatar from Auth0:', error);
    }
  }

  // Fetch user's active collection items
  const collectionItems = await prisma.collectionItem.findMany({
    where: {
      userId: profileUser.id,
      removedAt: null,
    },
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
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Transform collection items for the client component
  let collectionCards = collectionItems.map((item, index) => ({
    id: item.id,
    cardId: item.cardId,
    cardName: item.card.cardName,
    setName: item.card.setName,
    cardNumber: item.card.cardNumber,
    variety: item.card.variety,
    frontImageUrl: item.gradingCertificate.frontImageUrl || item.card.frontImageUrl,
    gradingCompany: item.gradingCertificate.gradingCompany,
    grade: item.gradingCertificate.grade,
    gradeLabel: item.gradingCertificate.gradeLabel,
    certNumber: item.gradingCertificate.certNumber,
    purchasePriceCents: item.purchasePriceCents,
    slabCondition: item.slabCondition,
    index: index + 1,
  }));

  // If no collection items and mock data flag is on, fall back to cards from DB
  if (collectionCards.length === 0 && useMockData) {
    const cards = await prisma.card.findMany({
      where: {
        frontImageUrl: { not: null },
      },
      select: {
        id: true,
        cardName: true,
        setName: true,
        cardNumber: true,
        variety: true,
        frontImageUrl: true,
        highestImageGrade: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
    });

    collectionCards = cards.map((card, index) => ({
      id: `mock-${card.id}`,
      cardId: card.id,
      cardName: card.cardName,
      setName: card.setName,
      cardNumber: card.cardNumber,
      variety: card.variety,
      frontImageUrl: card.frontImageUrl,
      gradingCompany: 'PSA',
      grade: card.highestImageGrade ?? 9,
      gradeLabel: null,
      certNumber: `MOCK${index + 1000}`,
      purchasePriceCents: Math.floor(Math.random() * 50000) + 5000,
      slabCondition: null,
      index: index + 1,
    }));
  }

  // Mock stats for now
  const stats = {
    following: 112,
    followers: 123,
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <CollectionPageClient
          user={{
            id: profileUser.id,
            slug: profileUser.slug,
            displayName: profileUser.displayName,
            avatarUrl: avatarUrl,
            bio: "Hello! I'm a Pokemon enthusiast with a special fondness for Bulbasaur!",
          }}
          stats={stats}
          collectionCards={collectionCards}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
