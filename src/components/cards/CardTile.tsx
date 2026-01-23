import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReactNode } from 'react';

export interface CardTileData {
  id: string;
  cardId: string;
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  variety: string | null;
  frontImageUrl: string | null;
  index: number;
  trendValue?: string;
  trendDirection?: 'up' | 'down';
}

interface CardTileProps {
  card: CardTileData;
  footer?: ReactNode;
}

/**
 * Shared card tile component - base UI for card display
 * Used by landing page (CardsSection) and collection page
 * Pass custom `footer` content for page-specific elements
 */
export function CardTile({ card, footer }: CardTileProps) {
  const isPositiveTrend = card.trendDirection !== 'down';
  const trendColor = isPositiveTrend ? 'text-emerald-500' : 'text-red-500';
  const trendValue = card.trendValue ?? (isPositiveTrend ? '+20' : '-10');

  return (
    <Link href={`/cards/${card.cardId}`}>
      <Card className="flex h-full cursor-pointer flex-col border-0 bg-transparent p-0 shadow-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <div className="flex w-full items-center justify-between">
              <span className="text-muted-foreground">#{card.index}</span>
              <span className={`inline-flex items-center gap-1 ${trendColor}`}>
                <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d={
                      isPositiveTrend
                        ? 'M5 10l5-5 5 5-1.4 1.4-2.6-2.6V16h-2V8.8L6.4 11.4z'
                        : 'M15 10l-5 5-5-5 1.4-1.4 2.6 2.6V4h2v7.2l2.6-2.6z'
                    }
                  />
                </svg>
                {trendValue}
              </span>
            </div>
          </div>
          {card.frontImageUrl ? (
            <div className="relative aspect-[63/88] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.frontImageUrl}
                alt={card.cardName || 'Card'}
                className="h-full w-full rounded-sm object-contain"
              />
            </div>
          ) : (
            <div className="bg-muted/30 flex aspect-[63/88] w-full items-center justify-center">
              <p className="text-muted-foreground text-center text-xs">No image</p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 pt-1">
          <CardHeader className="space-y-0.5 px-0 pb-0 pt-0">
            <CardTitle className="text-sm font-semibold line-clamp-1">
              {card.cardName || 'Unknown Card'}
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground line-clamp-1">
              <span>{card.variety || 'Rare'}</span>
              <span className="mx-1">|</span>
              <span>{card.setName || 'Pokemon XY'}</span>
              {card.cardNumber && <span className="ml-1">#{card.cardNumber}</span>}
            </CardDescription>
          </CardHeader>
          {footer && <CardContent className="px-0 pb-0 pt-0">{footer}</CardContent>}
        </div>
      </Card>
    </Link>
  );
}

/**
 * Footer for landing page cards - shows popular grade and amount sold
 */
export function CardTileBrowseFooter({
  popularGrade,
  amountSold,
}: {
  popularGrade: string;
  amountSold: number;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-1.5 text-[10px] font-medium">
      <span className="bg-muted/40 text-foreground whitespace-nowrap rounded-full px-2.5 py-0.5">
        Popular grade: {popularGrade}
      </span>
      <span className="bg-muted/40 text-foreground whitespace-nowrap rounded-full px-2.5 py-0.5">
        Amount sold: {amountSold.toLocaleString('en-US')}
      </span>
    </div>
  );
}
