import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';

/**
 * PM-90: Flat card listing - shows all cards
 * Sales data is used to populate cards and show sales history, but all cards are shown
 */
type CardsSectionProps = {
  showHeader?: boolean;
  title?: string;
  countLabel?: string;
};

export async function CardsSection({
  showHeader = true,
  title = 'Cards',
  countLabel,
}: CardsSectionProps = {}) {
  // Load all cards (grading-first approach)
  const cards = await prisma.card.findMany({
    include: {
      salesData: {
        orderBy: {
          date: 'desc',
        },
        take: 1, // Get most recent sale for display
        select: {
          value: true,
          date: true,
          imageUrl: true,
        },
      },
      _count: {
        select: {
          salesData: true,
          listings: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc', // Show newest cards first
    },
    take: 24, // Limit to 24 cards for initial display
  });

  if (cards.length === 0) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">{title}</h2>
          </div>
        )}
        <p className="text-muted-foreground text-sm">
          No cards available yet. Cards will appear here as they are added through listings or sales
          data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm">
            {countLabel ?? `${cards.length} card${cards.length === 1 ? '' : 's'}`}
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map((card, index) => {
          const latestSale = card.salesData[0];
          const hasListings = card._count.listings > 0;
          const trendLabel = hasListings ? '+20' : '-10';
          const trendColor = hasListings ? 'text-emerald-500' : 'text-red-500';
          const popularGrade = card.highestImageGrade
            ? `PSA ${card.highestImageGrade.toFixed(0)}`
            : 'PSA 10';
          const amountSold = latestSale?.value ? Math.round(latestSale.value) : 12000;

          return (
            <Link key={card.id} href={`/cards/${card.id}`}>
              <Card className="flex h-full cursor-pointer flex-col border-0 bg-transparent p-0 shadow-none">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <div className="flex w-full items-center justify-between">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span className={`inline-flex items-center gap-1 ${trendColor}`}>
                        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d={hasListings ? 'M5 10l5-5 5 5-1.4 1.4-2.6-2.6V16h-2V8.8L6.4 11.4z' : 'M15 10l-5 5-5-5 1.4-1.4 2.6 2.6V4h2v7.2l2.6-2.6z'}
                          />
                        </svg>
                        {trendLabel}
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
                  <CardContent className="px-0 pb-0 pt-0">
                    <div className="flex flex-nowrap items-center gap-1.5 text-[10px] font-medium">
                      <span className="bg-muted/40 text-foreground whitespace-nowrap rounded-full px-2.5 py-0.5">
                        Popular grade: {popularGrade}
                      </span>
                      <span className="bg-muted/40 text-foreground whitespace-nowrap rounded-full px-2.5 py-0.5">
                        Amount sold: {amountSold.toLocaleString('en-US')}
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
