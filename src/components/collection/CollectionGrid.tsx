'use client';

import { CardTile, CardTileCollectionFooter } from './CollectionCard';
import type { CardTileData } from '@/components/cards/CardTile';

export interface CollectionCardData extends CardTileData {
  gradingCompany?: string;
  grade?: number | null;
  gradeLabel?: string | null;
  purchasePriceCents?: number | null;
  fairMarketValueCents?: number | null;
}

interface CollectionGridProps {
  cards: CollectionCardData[];
  title: string;
  emptyMessage?: string;
  onAddToSell?: (cardId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function CollectionGrid({
  cards,
  title,
  emptyMessage = 'No cards in this collection yet.',
  onAddToSell,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: CollectionGridProps) {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Sort: Latest</span>
          <button type="button" className="transition hover:text-foreground">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path
                fill="currentColor"
                d="M10 6h10v2H10V6ZM4 5h4v4H4V5Zm6 11h10v2H10v-2Zm-6-1h4v4H4v-4Zm6-4h10v2H10v-2Zm-6-1h4v4H4V10Z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Cards grid */}
      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <svg
            className="size-12 text-muted-foreground/50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 10h18M7 15h4" />
          </svg>
          <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              footer={
                <CardTileCollectionFooter
                  data={{
                    id: card.id,
                    gradingCompany: card.gradingCompany,
                    grade: card.grade,
                    gradeLabel: card.gradeLabel,
                    purchasePriceCents: card.purchasePriceCents,
                    fairMarketValueCents: card.fairMarketValueCents,
                  }}
                  onAddToSell={onAddToSell}
                />
              }
            />
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
}
