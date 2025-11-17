import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { BrowseCardsButton } from '@/components/home/BrowseCardsButton';
import { ListingBuyButton } from '@/components/listings/ListingBuyButton';

export default async function Home() {
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
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-4xl font-bold">Welcome to Pokemon Marketplace</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Buy and sell Pokemon cards with ease. Browse our marketplace or start selling today!
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <CardTitle>Test Purchasing</CardTitle>
              </div>
              <CardDescription>Test the purchase flow with a $1 test payment.</CardDescription>
            </CardHeader>
            <CardContent>
              <BrowseCardsButton isAuthenticated={isAuthenticated} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                <CardTitle>Start Selling</CardTitle>
              </div>
              <CardDescription>List your Pokemon cards and reach buyers worldwide.</CardDescription>
            </CardHeader>
            <CardContent>
              {isAuthenticated ? (
                <Button asChild className="w-full">
                  <Link href="/account/seller">
                    Go to Seller Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href="/api/auth/login?returnTo=/account/seller">
                    Sign In to Start Selling
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Listings you can buy</h2>
            {listings.length > 0 && (
              <p className="text-muted-foreground text-sm">
                Showing {listings.length} listing{listings.length === 1 ? '' : 's'} available to
                you.
              </p>
            )}
          </div>

          {listings.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              There are no published listings available to purchase right now. Check back soon or
              start selling from your seller dashboard.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {listings.map((listing) => (
                <Card key={listing.id}>
                  <CardHeader className="space-y-1">
                    <CardTitle className="line-clamp-2 text-base">{listing.displayTitle}</CardTitle>
                    <CardDescription>
                      {listing.seller?.displayName
                        ? `Sold by ${listing.seller.displayName}`
                        : 'Sold by seller'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3">
                    <div className="text-lg font-semibold">
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
  );
}
