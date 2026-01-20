import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';

/**
 * PM-90: Flat card listing - shows all cards
 * Sales data is used to populate cards and show sales history, but all cards are shown
 */
export async function CardsSection() {
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Cards</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          No cards available yet. Cards will appear here as they are added through listings or sales
          data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Cards</h2>
        <p className="text-muted-foreground text-sm">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => {
          const latestSale = card.salesData[0];
          const hasListings = card._count.listings > 0;

          return (
            <Link key={card.id} href={`/cards/${card.id}`}>
              <Card className="h-full cursor-pointer overflow-hidden rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg">
                {card.frontImageUrl ? (
                  <div className="bg-muted/30 relative aspect-[63/88] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.frontImageUrl}
                      alt={card.cardName || 'Card'}
                      className="h-full w-full object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="bg-muted/30 flex aspect-[63/88] w-full items-center justify-center p-4">
                    <p className="text-muted-foreground text-center text-xs">No image</p>
                  </div>
                )}
                <CardHeader className="space-y-1 px-3 pt-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-sm leading-tight font-semibold">
                      {card.cardName || 'Unknown Card'}
                    </CardTitle>
                    {card.cardNumber && (
                      <span className="text-muted-foreground flex-shrink-0 font-mono text-xs">
                        #{card.cardNumber}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {card.setName || 'Unknown Set'}
                    {card.variety && <> • {card.variety}</>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 pt-0 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {hasListings && (
                        <Badge variant="default" className="text-xs">
                          Available
                        </Badge>
                      )}
                      {card._count.salesData > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {card._count.salesData} sale{card._count.salesData === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                    {latestSale ? (
                      <div className="text-kado-blue text-sm font-semibold">
                        $
                        {latestSale.value.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">No sales data</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
