import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';

// Format date consistently for SSR (avoids hydration mismatches)
function formatReleaseDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  return `${month} ${day}, ${year}`;
}

interface Set {
  id: string;
  name: string;
  series: string;
  total: number;
  printedTotal?: number;
  legalities?: Record<string, string>;
  ptcgoCode?: string;
  releaseDate?: string;
  images?: {
    logo?: string;
    symbol?: string;
  };
}

export async function SetsSection() {
  // Load sets from database
  const setsData = await prisma.pokemonSet.findMany({
    orderBy: { name: 'asc' },
  });

  // Filter sets to unique names (keep first occurrence)
  const seenNames = new Set<string>();
  const uniqueSets = setsData.filter((set: any) => {
    if (seenNames.has(set.name)) {
      return false;
    }
    seenNames.add(set.name);
    return true;
  });

  // Map to expected format
  const sets: Set[] = uniqueSets.map((set: any) => ({
    id: set.id,
    name: set.name,
    series: set.series,
    total: set.total,
    printedTotal: set.printedTotal ?? undefined,
    legalities: set.legalities as Record<string, string> | undefined,
    ptcgoCode: set.ptcgoCode ?? undefined,
    releaseDate: set.releaseDate ?? undefined,
    images: {
      logo: set.logoUrl ?? undefined,
      symbol: set.symbolUrl ?? undefined,
    },
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Pokémon TCG Sets</h2>
        <p className="text-muted-foreground text-sm">
          {sets.length} set{sets.length === 1 ? '' : 's'} available
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sets.map((set) => (
          <Link key={set.id} href={`/sets/${set.id}`}>
            <Card className="overflow-hidden rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full">
              {set.images?.logo && (
                <div className="relative bg-muted/30 aspect-video w-full">
                  <Image
                    src={set.images.logo}
                    alt={set.name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    loading="lazy"
                  />
                </div>
              )}
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="line-clamp-2 text-base">{set.name}</CardTitle>
                <CardDescription>
                  {set.series} • {set.total} cards
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Legality Badges */}
                {set.legalities && (
                  <div className="flex flex-wrap gap-1.5">
                    {set.legalities.standard === 'Legal' && (
                      <Badge variant="outline" className="text-xs">
                        Standard
                      </Badge>
                    )}
                    {set.legalities.expanded === 'Legal' && (
                      <Badge variant="outline" className="text-xs">
                        Expanded
                      </Badge>
                    )}
                    {set.legalities.unlimited === 'Legal' && (
                      <Badge variant="outline" className="text-xs">
                        Unlimited
                      </Badge>
                    )}
                  </div>
                )}
                <div className="text-muted-foreground text-xs space-y-1">
                  {set.releaseDate && (
                    <p>Released: {formatReleaseDate(set.releaseDate)}</p>
                  )}
                  {set.ptcgoCode && <p>Code: {set.ptcgoCode}</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
