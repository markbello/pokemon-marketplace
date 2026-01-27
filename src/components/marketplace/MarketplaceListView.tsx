'use client';

import { SlabImage } from '@/components/cards/SlabImage';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import type { MarketplaceCardData } from './MarketplaceCardTile';
import type { SortOrder, ViewMode } from './MarketplaceGrid';
import { List, LayoutGrid } from 'lucide-react';

interface MarketplaceListViewProps {
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
 * List/table view for My Marketplace
 * Shows cards in a table format with columns: Order, Name, Image, Cost, Price, Edit
 */
export function MarketplaceListView({
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
}: MarketplaceListViewProps) {
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

      {/* Table */}
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
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Image</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cost</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Edit</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => {
                const isDraft = card.status === 'DRAFT';
                const cardName = card.cardName || card.displayTitle;
                const hasPrice = card.askingPriceCents > 0;

                // Additional image count for the "+N" badge
                const additionalImages = card.additionalImageCount || 0;

                return (
                  <tr key={card.id} className="border-b last:border-0">
                    {/* Order number */}
                    <td className="px-4 py-3 font-medium">
                      {String(card.displayIndex).padStart(3, '0')}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium line-clamp-1">
                          {isDraft && !cardName ? '/' : cardName}
                        </span>
                        {card.variety && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {card.variety}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Image with additional image count badge */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 shrink-0">
                          {card.imageUrl ? (
                            <SlabImage src={card.imageUrl} alt={cardName || 'Card'} />
                          ) : (
                            <div className="flex aspect-[3/4] items-center justify-center rounded bg-muted/50 text-[8px] text-muted-foreground">
                              No img
                            </div>
                          )}
                        </div>
                        {additionalImages > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                            +{additionalImages}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cost (original cost - placeholder for now) */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {hasPrice ? formatCurrency(card.askingPriceCents) : '$ /'}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 font-medium">
                      {hasPrice ? formatCurrency(card.askingPriceCents) : '$ /'}
                    </td>

                    {/* Edit button */}
                    <td className="px-4 py-3">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 px-4 text-xs"
                        onClick={() => onEditCard?.(card.id)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
