'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';

// Re-export base CardTile for use in collection
export { CardTile } from '@/components/cards/CardTile';
export type { CardTileData } from '@/components/cards/CardTile';

export interface CollectionFooterData {
  id: string;
  gradingCompany?: string;
  grade?: number | null;
  gradeLabel?: string | null;
  purchasePriceCents?: number | null;
  fairMarketValueCents?: number | null;
}

interface CollectionFooterProps {
  data: CollectionFooterData;
  onAddToSell?: (id: string) => void;
}

/**
 * Footer for collection page cards - shows grade, purchase price, FMV, and sell button
 */
export function CardTileCollectionFooter({ data, onAddToSell }: CollectionFooterProps) {
  const gradeDisplay = data.grade
    ? `${data.gradingCompany || 'PSA'} ${data.grade % 1 === 0 ? data.grade.toFixed(0) : data.grade}`
    : data.gradeLabel || data.gradingCompany || 'PSA 10';

  // Use a stable fallback for FMV (real data should come from server)
  const fmvCents = data.fairMarketValueCents ?? 21200;

  return (
    <div className="flex flex-col gap-2">
      {/* Grade badge and purchase price */}
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary"
        >
          {gradeDisplay}
        </Badge>
        {data.purchasePriceCents && (
          <span className="cursor-pointer text-[10px] text-violet-600 hover:underline">
            Purchase price {formatCurrency(data.purchasePriceCents)}
          </span>
        )}
      </div>

      {/* Add to sell button and FMV */}
      <div className="flex items-center justify-between gap-2">
        {onAddToSell && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[10px]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToSell(data.id);
            }}
          >
            Add to sell
            <svg
              className="ml-1 size-3"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l4 4 4-4" />
            </svg>
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground">
          FMV <span className="font-semibold text-foreground">{formatCurrency(fmvCents)}</span>
        </span>
      </div>
    </div>
  );
}
