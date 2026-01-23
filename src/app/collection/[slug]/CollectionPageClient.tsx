'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CollectionHeader } from '@/components/collection/CollectionHeader';
import { CollectionGrid, type CollectionCardData } from '@/components/collection/CollectionGrid';

interface CollectionPageClientProps {
  user: {
    id: string;
    slug: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    bio?: string | null;
  };
  stats: {
    following: number;
    followers: number;
  };
  collectionCards: CollectionCardData[];
  isOwner: boolean;
}

export function CollectionPageClient({
  user,
  stats,
  collectionCards,
  isOwner,
}: CollectionPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'my-collection' | 'friends-collection'>('my-collection');
  const [visibleCount, setVisibleCount] = useState(20);

  const handleAddCard = () => {
    // TODO: Open add card modal or navigate to add card page
    console.log('Add card clicked');
  };

  const handleAddToSell = (cardId: string) => {
    // TODO: Navigate to create listing page with card pre-selected
    router.push(`/account/seller?listCard=${cardId}`);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 20);
  };

  const visibleCards = collectionCards.slice(0, visibleCount);
  const hasMore = collectionCards.length > visibleCount;

  // Determine collection title based on ownership
  const collectionTitle = isOwner ? 'My Collection' : `${user.displayName || 'User'}'s Collection`;

  return (
    <div className="space-y-8">
      <CollectionHeader
        user={user}
        stats={stats}
        isOwner={isOwner}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddCard={handleAddCard}
      />

      {activeTab === 'my-collection' ? (
        <>
          <CollectionGrid
            cards={visibleCards}
            title={collectionTitle}
            emptyMessage={
              isOwner
                ? "You haven't added any cards to your collection yet. Click 'List a Card' to get started!"
                : 'This user has no cards in their collection yet.'
            }
            onAddToSell={isOwner ? handleAddToSell : undefined}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />

          {/* Not Collected section - only show for owner */}
          {isOwner && (
            <div className="pt-8">
              <CollectionGrid
                cards={[]}
                title="Not Collected"
                emptyMessage="Cards you're looking for will appear here."
              />
            </div>
          )}
        </>
      ) : (
        <CollectionGrid
          cards={[]}
          title="Friends Collection"
          emptyMessage="Follow other collectors to see their cards here."
        />
      )}
    </div>
  );
}
