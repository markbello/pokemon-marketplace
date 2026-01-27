'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SlabImage } from '@/components/cards/SlabImage';
import { formatCurrency } from '@/lib/currency';

export interface MarketplaceCardData {
  id: string;
  displayIndex: number;
  displayTitle: string;
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  variety: string | null;
  imageUrl: string | null;
  askingPriceCents: number;
  currency: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SOLD';
  gradingCompany?: string | null;
  grade?: number | null;
  gradeLabel?: string | null;
  /** Number of additional images beyond the main one */
  additionalImageCount?: number;
}

interface MarketplaceCardTileProps {
  card: MarketplaceCardData;
  onEdit?: (id: string) => void;
}

/**
 * Card tile for My Marketplace grid view
 * Shows card info, grade badge, price, and edit button
 * Explicitly excludes trend indicators per PM-84 requirements
 */
export function MarketplaceCardTile({ card, onEdit }: MarketplaceCardTileProps) {
  const cardName = card.cardName || card.displayTitle || 'Title';
  const hasPrice = card.askingPriceCents > 0;
  const priceDisplay = hasPrice ? formatCurrency(card.askingPriceCents) : '$ /';

  // Build grade display
  const gradeDisplay = card.grade
    ? `${card.gradingCompany || 'PSA'} ${card.grade % 1 === 0 ? card.grade.toFixed(0) : card.grade}`
    : card.gradeLabel
      ? `${card.gradingCompany || 'PSA'} ${card.gradeLabel}`
      : card.gradingCompany || 'PSA 10';

  const isDraft = card.status === 'DRAFT';
  const noImage = !card.imageUrl;

  return (
    <Card className="flex h-full cursor-pointer flex-col border-0 bg-transparent p-0 shadow-none">
      <div className="flex flex-col gap-1">
        {/* Index number */}
        <div className="text-[11px] font-semibold text-muted-foreground">
          #{card.displayIndex}
        </div>

        {/* Card image with "No image" placeholder for drafts */}
        <div className="relative">
          {noImage && isDraft ? (
            <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-muted/50">
              <span className="text-sm font-medium text-muted-foreground">No image</span>
            </div>
          ) : (
            <SlabImage src={card.imageUrl} alt={cardName} />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 pt-1">
        <CardHeader className="space-y-0.5 px-0 pb-0 pt-0">
          <CardTitle className="text-sm font-semibold line-clamp-1">
            {isDraft && !card.cardName ? 'Title' : cardName}
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground line-clamp-1">
            <span>{card.variety || 'Rare'}</span>
            <span className="mx-1">|</span>
            <span>{card.setName || 'Pokemon XY'}</span>
            {card.cardNumber && <span className="ml-1">#{card.cardNumber}</span>}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-2 px-0 pb-0 pt-0">
          {/* Grade badge */}
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary"
            >
              {gradeDisplay}
            </Badge>
          </div>

          {/* Edit button and price */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[10px]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(card.id);
              }}
            >
              Edit
              {isDraft && (
                <svg
                  className="ml-1 h-3 w-3"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l4 4 4-4" />
                </svg>
              )}
            </Button>
            <span className="text-sm font-semibold">{priceDisplay}</span>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
