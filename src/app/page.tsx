import { auth0 } from '@/lib/auth0';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { BrowseCardsButton } from '@/components/home/BrowseCardsButton';

export default async function Home() {
  const session = await auth0.getSession();
  const isAuthenticated = !!session?.user;

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
              <CardDescription>
                Test the purchase flow with a $1 test payment.
              </CardDescription>
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
              <CardDescription>
                List your Pokemon cards and reach buyers worldwide.
              </CardDescription>
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
      </div>
    </div>
  );
}
