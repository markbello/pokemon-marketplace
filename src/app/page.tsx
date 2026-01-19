import { getAuth0Client } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListingBuyButton } from '@/components/listings/ListingBuyButton';
import { CardsSection } from '@/components/cards/CardsSection';

export default async function Home() {
  const auth0 = await getAuth0Client();
  const session = await auth0.getSession();
  const isAuthenticated = !!session?.user;
  const userId = session?.user?.sub;

  const listings = await prisma.listing.findMany({
    where: {
      status: 'PUBLISHED',
      ...(userId ? { NOT: { sellerId: userId } } : {}),
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      seller: {
        select: {
          displayName: true,
        },
      },
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-12">
          {/* Cards Section - PM-90: Grading-first approach */}
          <CardsSection />

          {/* Listings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">All listings</h2>
              {listings.length > 0 && (
                <p className="text-muted-foreground text-sm">
                  Showing {listings.length} listing{listings.length === 1 ? '' : 's'}
                </p>
              )}
            </div>

          {listings.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              There are no published listings available to purchase right now. Check back soon or
              start selling from your seller dashboard.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing: (typeof listings)[number]) => (
                <Card key={listing.id} className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={listing.imageUrl || '/kado-placeholder.jpg'}
                    alt={listing.displayTitle}
                    className="bg-muted/30 aspect-4/3 w-full object-contain"
                  />
                  <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="line-clamp-2 text-base">{listing.displayTitle}</CardTitle>
                    <CardDescription>
                      {listing.seller?.displayName
                        ? `Sold by ${listing.seller.displayName}`
                        : 'Sold by seller'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 pt-0">
                    <div className="text-kado-blue text-lg font-semibold">
                      {(listing.askingPriceCents / 100).toLocaleString('en-US', {
                        style: 'currency',
                        currency: listing.currency || 'USD',
                      })}
                    </div>
                    <ListingBuyButton listingId={listing.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
