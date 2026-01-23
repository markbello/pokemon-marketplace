import { prisma } from '@/lib/prisma';
import { CardTile, CardTileBrowseFooter } from './CardTile';

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
          const popularGrade = card.highestImageGrade
            ? `PSA ${card.highestImageGrade.toFixed(0)}`
            : 'PSA 10';
          const amountSold = latestSale?.value ? Math.round(latestSale.value) : 12000;

          return (
            <CardTile
              key={card.id}
              card={{
                id: card.id,
                cardId: card.id,
                cardName: card.cardName,
                setName: card.setName,
                cardNumber: card.cardNumber,
                variety: card.variety,
                frontImageUrl: card.frontImageUrl,
                index: index + 1,
                trendValue: hasListings ? '+20' : '-10',
                trendDirection: hasListings ? 'up' : 'down',
              }}
              footer={<CardTileBrowseFooter popularGrade={popularGrade} amountSold={amountSold} />}
            />
          );
        })}
      </div>
    </div>
  );
}
