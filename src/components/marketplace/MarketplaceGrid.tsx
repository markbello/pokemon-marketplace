'use client';

import { MarketplaceCardTile, type MarketplaceCardData } from './MarketplaceCardTile';
import { List, LayoutGrid } from 'lucide-react';

export type SortOrder = 'latest' | 'oldest';
export type ViewMode = 'grid' | 'list';

interface MarketplaceGridProps {
  title: string;
  cards: MarketplaceCardData[];
  sortOrder: SortOrder;
  onSortChange: (sort: SortOrder) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onEditCard?: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  showViewToggle?: boolean;
}

/**
 * Grid section for My Marketplace
 * Shows cards in a responsive grid with sort and view toggles
 */
export function MarketplaceGrid({
  title,
  cards,
  sortOrder,
  onSortChange,
  viewMode,
  onViewModeChange,
  onEditCard,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  emptyMessage = 'No cards in this section yet.',
  showViewToggle = true,
}: MarketplaceGridProps) {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value as SortOrder)}
              className="cursor-pointer bg-transparent font-medium text-foreground outline-none"
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
            </select>
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
              <path d="M5 8l5 5 5-5" />
            </svg>
          </div>

          {/* View toggle */}
          {showViewToggle && (
            <div className="flex items-center gap-1 border-l border-muted pl-3">
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`p-1 transition ${
                  viewMode === 'list' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`p-1 transition ${
                  viewMode === 'grid' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards grid */}
      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <svg
            className="h-12 w-12 text-muted-foreground/50"
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
            <MarketplaceCardTile
              key={card.id}
              card={card}
              onEdit={onEditCard}
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
