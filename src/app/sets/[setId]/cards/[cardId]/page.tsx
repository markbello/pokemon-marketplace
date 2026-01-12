import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { prisma } from '@/lib/prisma';

interface Attack {
  cost?: string[];
  name: string;
  damage?: string;
  text?: string;
  convertedEnergyCost?: number;
}

interface Ability {
  type?: string;
  name: string;
  text: string;
}

interface Weakness {
  type: string;
  value: string;
}

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
  attacks?: Attack[];
  abilities?: Ability[];
  weaknesses?: Weakness[];
  resistances?: Weakness[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  legalities?: {
    unlimited?: string;
    standard?: string;
    expanded?: string;
  };
  regulationMark?: string;
  artist?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  rules?: string[];
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ setId: string; cardId: string }>;
}) {
  const { setId, cardId } = await params;

  // Load set from database
  const set = await prisma.pokemonSet.findUnique({
    where: { id: setId },
  });

  if (!set) {
    notFound();
  }

  // Load card from database
  const cardData = await prisma.pokemonCard.findUnique({
    where: { id: cardId },
  });

  if (!cardData || cardData.pokemonSetId !== setId) {
    notFound();
  }

  // Extract data from JSON fields
  const cardDataJson = (cardData.cardData as Record<string, unknown>) || {};
  const metadata = (cardData.metadata as Record<string, unknown>) || {};

  // Map to expected format
  const card: CardData = {
    id: cardData.id,
    name: cardData.name,
    supertype: cardData.supertype,
    subtypes: cardData.subtypes,
    number: cardData.number,
    rarity: cardData.rarity ?? undefined,
    images: {
      small: cardData.imageSmallUrl ?? undefined,
      large: cardData.imageLargeUrl ?? undefined,
    },
    types: (cardDataJson.types as string[]) ?? undefined,
    hp: (cardDataJson.hp as string) ?? undefined,
    attacks: (cardDataJson.attacks as Attack[]) ?? undefined,
    abilities: (cardDataJson.abilities as Ability[]) ?? undefined,
    weaknesses: (cardDataJson.weaknesses as Weakness[]) ?? undefined,
    resistances: (cardDataJson.resistances as Weakness[]) ?? undefined,
    retreatCost: (cardDataJson.retreatCost as string[]) ?? undefined,
    convertedRetreatCost: (cardDataJson.convertedRetreatCost as number) ?? undefined,
    legalities: (metadata.legalities as Record<string, string>) ?? undefined,
    regulationMark: (metadata.regulationMark as string) ?? undefined,
    artist: cardData.artist ?? undefined,
    flavorText: cardData.flavorText ?? undefined,
    nationalPokedexNumbers: (metadata.nationalPokedexNumbers as number[]) ?? undefined,
    rules: undefined, // Not stored in our schema
  };

  const isPokemon = card.supertype === 'Pokémon';
  const isTrainer = card.supertype === 'Trainer';
  const isEnergy = card.supertype === 'Energy';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Sets
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            href={`/sets/${setId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {set.name}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">{card.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Card Image */}
          <div className="space-y-4">
            <Card className="overflow-hidden rounded-xl">
              {card.images?.large ? (
                <div className="relative bg-muted/30 aspect-[63/88] w-full">
                  <Image
                    src={card.images.large}
                    alt={card.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </div>
              ) : card.images?.small ? (
                <div className="relative bg-muted/30 aspect-[63/88] w-full">
                  <Image
                    src={card.images.small}
                    alt={card.name}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </div>
              ) : (
                <div className="bg-muted/30 aspect-[63/88] w-full flex items-center justify-center p-8">
                  <p className="text-muted-foreground text-center">No image available</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Card Details */}
          <div className="space-y-6">
            {/* Card Header */}
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold">{card.name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{card.supertype}</Badge>
                      {card.subtypes && card.subtypes.length > 0 && (
                        <>
                          {card.subtypes.map((subtype) => (
                            <Badge key={subtype} variant="secondary">
                              {subtype}
                            </Badge>
                          ))}
                        </>
                      )}
                      {card.number && (
                        <span className="text-muted-foreground text-sm font-mono">
                          #{card.number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="flex flex-wrap gap-2">
                {card.types && card.types.length > 0 && (
                  <>
                    {card.types.map((type) => (
                      <Badge key={type} variant="default" className="text-sm">
                        {type}
                      </Badge>
                    ))}
                  </>
                )}
                {card.hp && (
                  <Badge variant="outline" className="text-sm">
                    HP {card.hp}
                  </Badge>
                )}
                {card.rarity && (
                  <Badge variant="outline" className="text-sm">
                    {card.rarity}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Pokemon-specific Information */}
            {isPokemon && (
              <>
                {/* Abilities */}
                {card.abilities && card.abilities.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xl font-semibold">Abilities</h2>
                    {card.abilities.map((ability, index) => (
                      <Card key={index} className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            {ability.type && (
                              <Badge variant="outline" className="text-xs">
                                {ability.type}
                              </Badge>
                            )}
                            <CardTitle className="text-base">{ability.name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed">{ability.text}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Attacks */}
                {card.attacks && card.attacks.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xl font-semibold">Attacks</h2>
                    {card.attacks.map((attack, index) => (
                      <Card key={index} className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {attack.cost && attack.cost.length > 0 && (
                              <div className="flex gap-1">
                                {attack.cost.map((energy, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {energy}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <CardTitle className="text-base">{attack.name}</CardTitle>
                            {attack.damage && (
                              <Badge variant="outline" className="text-xs">
                                {attack.damage}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        {attack.text && (
                          <CardContent>
                            <p className="text-sm leading-relaxed">{attack.text}</p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}

                {/* Weaknesses & Resistances */}
                {(card.weaknesses || card.resistances) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {card.weaknesses && card.weaknesses.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold">Weakness</h3>
                        <div className="flex flex-wrap gap-2">
                          {card.weaknesses.map((weakness, index) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {weakness.type} {weakness.value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {card.resistances && card.resistances.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold">Resistance</h3>
                        <div className="flex flex-wrap gap-2">
                          {card.resistances.map((resistance, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {resistance.type} {resistance.value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Retreat Cost */}
                {card.retreatCost && card.retreatCost.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Retreat Cost</h3>
                    <div className="flex gap-1">
                      {card.retreatCost.map((cost, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {cost}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* National Pokedex Numbers */}
                {card.nationalPokedexNumbers && card.nationalPokedexNumbers.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">National Pokédex</h3>
                    <div className="flex flex-wrap gap-2">
                      {card.nationalPokedexNumbers.map((num) => (
                        <Badge key={num} variant="outline" className="text-xs">
                          #{num}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Trainer-specific Information */}
            {isTrainer && card.rules && card.rules.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Rules</h2>
                <Card className="bg-muted/30">
                  <CardContent className="pt-6">
                    <ul className="space-y-2 text-sm leading-relaxed">
                      {card.rules.map((rule, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            {/* Flavor Text */}
            {card.flavorText && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Flavor Text</h3>
                <p className="text-muted-foreground italic leading-relaxed">{card.flavorText}</p>
              </div>
            )}

            {/* Legalities */}
            {card.legalities && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Legalities</h3>
                <div className="flex flex-wrap gap-2">
                  {card.legalities.standard === 'Legal' && (
                    <Badge variant="outline">Standard</Badge>
                  )}
                  {card.legalities.expanded === 'Legal' && (
                    <Badge variant="outline">Expanded</Badge>
                  )}
                  {card.legalities.unlimited === 'Legal' && (
                    <Badge variant="outline">Unlimited</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Regulation Mark */}
            {card.regulationMark && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Regulation Mark</h3>
                <Badge variant="outline">{card.regulationMark}</Badge>
              </div>
            )}

            {/* Artist */}
            {card.artist && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Artist</h3>
                <p className="text-muted-foreground text-sm">{card.artist}</p>
              </div>
            )}

            {/* Set Information */}
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Set Information</h3>
              <div className="text-muted-foreground space-y-1 text-sm">
                <p>
                  <span className="font-medium">Set:</span> {set.name}
                </p>
                <p>
                  <span className="font-medium">Series:</span> {set.series}
                </p>
                {set.ptcgoCode && (
                  <p>
                    <span className="font-medium">PTCGO Code:</span> {set.ptcgoCode}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
