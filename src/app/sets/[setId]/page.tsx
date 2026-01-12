import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';

interface CardData {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  number: string;
  rarity?: string;
  images?: {
    small?: string;
    large?: string;
  };
  types?: string[];
  hp?: string;
  legalities?: {
    unlimited?: string;
    standard?: string;
    expanded?: string;
  };
}

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;

  // Load set from database
  const set = await prisma.pokemonSet.findUnique({
    where: { id: setId },
  });

  if (!set) {
    notFound();
  }

  // Load cards for this set from database
  const cardsData = await prisma.pokemonCard.findMany({
    where: { pokemonSetId: setId },
    orderBy: { number: 'asc' },
  });

  // Map cards to expected format
  const cards: CardData[] = cardsData.map((card: any) => {
    const cardData = (card.cardData as Record<string, unknown>) || {};
    const metadata = (card.metadata as Record<string, unknown>) || {};

    return {
      id: card.id,
      name: card.name,
      supertype: card.supertype,
      subtypes: card.subtypes,
      number: card.number,
      rarity: card.rarity ?? undefined,
      images: {
        small: card.imageSmallUrl ?? undefined,
        large: card.imageLargeUrl ?? undefined,
      },
      types: (cardData.types as string[]) ?? undefined,
      hp: (cardData.hp as string) ?? undefined,
      legalities: (metadata.legalities as Record<string, string>) ?? undefined,
    };
  });

  // Sort cards by number (convert to number for proper sorting)
  const sortedCards = [...cards].sort((a, b) => {
    const numA = parseInt(a.number || '0', 10);
    const numB = parseInt(b.number || '0', 10);
    return numA - numB;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Back button */}
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center text-sm transition-colors"
        >
          ← Back to all sets
        </Link>

        {/* Set Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {set.logoUrl && (
              <div className="relative flex-shrink-0 w-full max-w-xs h-48 md:max-w-sm md:h-64">
                <Image
                  src={set.logoUrl}
                  alt={set.name}
                  fill
                  className="bg-muted/30 rounded-lg object-contain p-6"
                  sizes="(max-width: 768px) 100vw, 384px"
                  loading="eager"
                  priority
                />
              </div>
            )}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold">{set.name}</h1>
                <p className="text-muted-foreground mt-1 text-lg">{set.series}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {set.legalities &&
                  typeof set.legalities === 'object' &&
                  'standard' in set.legalities &&
                  (set.legalities as Record<string, string>).standard === 'Legal' && (
                    <Badge variant="outline">Standard</Badge>
                  )}
                {set.legalities &&
                  typeof set.legalities === 'object' &&
                  'expanded' in set.legalities &&
                  (set.legalities as Record<string, string>).expanded === 'Legal' && (
                    <Badge variant="outline">Expanded</Badge>
                  )}
                {set.legalities &&
                  typeof set.legalities === 'object' &&
                  'unlimited' in set.legalities &&
                  (set.legalities as Record<string, string>).unlimited === 'Legal' && (
                    <Badge variant="outline">Unlimited</Badge>
                  )}
              </div>
              <div className="text-muted-foreground space-y-1 text-sm">
                <p>
                  <span className="font-medium">Total Cards:</span> {set.total}
                  {set.printedTotal && set.printedTotal !== set.total && ` (${set.printedTotal} printed)`}
                </p>
                {set.releaseDate && (
                  <p>
                    <span className="font-medium">Released:</span>{' '}
                    {new Date(set.releaseDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
                {set.ptcgoCode && (
                  <p>
                    <span className="font-medium">PTCGO Code:</span> {set.ptcgoCode}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Cards</h2>
            <p className="text-muted-foreground text-sm">
              {sortedCards.length} card{sortedCards.length === 1 ? '' : 's'}
            </p>
          </div>

          {sortedCards.length === 0 ? (
            <p className="text-muted-foreground">No cards found for this set.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {sortedCards.map((card) => (
                <Link key={card.id} href={`/sets/${setId}/cards/${card.id}`}>
                  <Card className="overflow-hidden rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full">
                    {card.images?.small ? (
                      <div className="relative bg-muted/30 aspect-[63/88] w-full">
                        <Image
                          src={card.images.small}
                          alt={card.name}
                          fill
                          className="object-contain p-2"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="bg-muted/30 aspect-[63/88] w-full flex items-center justify-center p-4">
                        <p className="text-muted-foreground text-xs text-center">No image</p>
                      </div>
                    )}
                    <CardHeader className="space-y-1 pb-2 px-3 pt-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="line-clamp-2 text-sm font-semibold leading-tight">
                          {card.name}
                        </CardTitle>
                        {card.number && (
                          <span className="text-muted-foreground flex-shrink-0 text-xs font-mono">
                            #{card.number}
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {card.supertype}
                        {card.subtypes && card.subtypes.length > 0 && (
                          <> • {card.subtypes.join(', ')}</>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0">
                      <div className="flex flex-wrap gap-1.5">
                        {card.types && card.types.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {card.types.join(' / ')}
                          </Badge>
                        )}
                        {card.hp && (
                          <Badge variant="outline" className="text-xs">
                            HP {card.hp}
                          </Badge>
                        )}
                        {card.rarity && (
                          <Badge variant="outline" className="text-xs">
                            {card.rarity}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
