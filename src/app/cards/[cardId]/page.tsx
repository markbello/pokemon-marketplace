import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { prisma } from '@/lib/prisma';

export default async function CardDetailPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;

  // Load card with sales data and listings
  const cardData = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      salesData: {
        orderBy: {
          date: 'desc',
        },
        take: 20, // Show recent sales
      },
      listings: {
        where: {
          status: 'PUBLISHED',
        },
        include: {
          seller: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: {
          askingPriceCents: 'asc',
        },
      },
      _count: {
        select: {
          salesData: true,
          listings: true,
        },
      },
    },
  });

  if (!cardData) {
    notFound();
  }

  // Calculate price statistics from sales data
  const salesValues = cardData.salesData.map((sale) => sale.value);
  const avgPrice =
    salesValues.length > 0
      ? salesValues.reduce((sum, val) => sum + val, 0) / salesValues.length
      : null;
  const minPrice = salesValues.length > 0 ? Math.min(...salesValues) : null;
  const maxPrice = salesValues.length > 0 ? Math.max(...salesValues) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Cards
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">{cardData.cardName || 'Card'}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Card Images */}
          <div className="space-y-4">
            {/* Front Image */}
            {cardData.frontImageUrl ? (
              <Card className="overflow-hidden rounded-xl">
                <div className="bg-muted/30 relative aspect-[63/88] w-full">
                  <Image
                    src={cardData.frontImageUrl}
                    alt={`${cardData.cardName || 'Card'} - Front`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </div>
                <CardContent className="pt-2">
                  <p className="text-muted-foreground text-center text-xs">Front</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden rounded-xl">
                <div className="bg-muted/30 flex aspect-[63/88] w-full items-center justify-center p-8">
                  <p className="text-muted-foreground text-center">
                    {cardData.cardName || 'Card'}
                    {cardData.cardNumber && ` #${cardData.cardNumber}`}
                  </p>
                </div>
              </Card>
            )}

            {/* Back Image */}
            {cardData.backImageUrl && (
              <Card className="overflow-hidden rounded-xl">
                <div className="bg-muted/30 relative aspect-[63/88] w-full">
                  <Image
                    src={cardData.backImageUrl}
                    alt={`${cardData.cardName || 'Card'} - Back`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <CardContent className="pt-2">
                  <p className="text-muted-foreground text-center text-xs">Back</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Card Details */}
          <div className="space-y-6">
            {/* Card Header */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold">{cardData.cardName || 'Unknown Card'}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {cardData.setName && <Badge variant="outline">{cardData.setName}</Badge>}
                  {cardData.cardNumber && (
                    <span className="text-muted-foreground font-mono text-sm">
                      #{cardData.cardNumber}
                    </span>
                  )}
                  {cardData.variety && <Badge variant="secondary">{cardData.variety}</Badge>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Price Statistics */}
            {salesValues.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Price Statistics</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {avgPrice && (
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Average</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          $
                          {avgPrice.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {minPrice && (
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Low</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          $
                          {minPrice.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {maxPrice && (
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">High</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          $
                          {maxPrice.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Available Listings */}
            {cardData.listings.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Available Listings</h2>
                <div className="space-y-2">
                  {cardData.listings.map((listing) => (
                    <Card key={listing.id} className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{listing.displayTitle}</p>
                            <p className="text-muted-foreground text-sm">
                              {listing.seller?.displayName || 'Seller'}
                            </p>
                          </div>
                          <div className="text-kado-blue text-lg font-semibold">
                            {(listing.askingPriceCents / 100).toLocaleString('en-US', {
                              style: 'currency',
                              currency: listing.currency || 'USD',
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Sales History */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Recent Sales</h2>
              {cardData.salesData.length > 0 ? (
                <div className="space-y-2">
                  {cardData.salesData.map((sale) => (
                    <Card key={sale.id} className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">
                              $
                              {sale.value.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {new Date(sale.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                              {sale.isAuction && (
                                <Badge variant="outline" className="ml-2">
                                  Auction
                                </Badge>
                              )}
                            </p>
                          </div>
                          {sale.gradingCompany && (
                            <Badge variant="secondary">{sale.gradingCompany}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="py-6">
                    <p className="text-muted-foreground text-sm">
                      No sales history yet. This card was recently added.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Metadata */}
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Card Information</h3>
              <div className="text-muted-foreground space-y-1 text-sm">
                {cardData.psaSpecId && (
                  <p>
                    <span className="font-medium">PSA Spec ID:</span> {cardData.psaSpecId}
                  </p>
                )}
                <p>
                  <span className="font-medium">Total Sales:</span> {cardData._count.salesData}
                </p>
                <p>
                  <span className="font-medium">Active Listings:</span> {cardData._count.listings}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
