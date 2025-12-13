import { getAuth0Client } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight, ShoppingBag, Mail } from 'lucide-react';
import Link from 'next/link';
import { BrowseCardsButton } from '@/components/home/BrowseCardsButton';
import { ListingBuyButton } from '@/components/listings/ListingBuyButton';
import { TestEmailSender } from '@/components/home/TestEmailSender';
import { detectRuntimeEnvironment } from '@/lib/env';

export default async function Home() {
  const runtime = await detectRuntimeEnvironment();
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
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-kado-blue text-4xl font-bold">Welcome to kado.io</h1>
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              runtime === 'prod' ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
            }`}
            title={`VERCEL_URL: ${process.env.VERCEL_URL || 'local'}`}
          >
            {runtime === 'prod' ? 'PROD' : 'STAGING'}
          </div>
        </div>
        <p className="text-muted-foreground mb-8 text-lg">
          Buy and sell trading cards with ease. Browse our marketplace or start selling today!
        </p>

        <div className="grid gap-6 md:grid-cols-3">
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
              <CardDescription>List your cards and reach buyers worldwide.</CardDescription>
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

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <CardTitle>Send Test Email</CardTitle>
              </div>
              <CardDescription>Dev-only helper to trigger the test email endpoint.</CardDescription>
            </CardHeader>
            <CardContent>
              <TestEmailSender />
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Card key={listing.id} className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={listing.imageUrl || '/kado-placeholder.jpg'}
                    alt={listing.displayTitle}
                    className="bg-muted/30 aspect-[4/3] w-full object-contain"
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
  );
}
