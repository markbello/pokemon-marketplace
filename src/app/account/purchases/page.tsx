import { getAuth0Client } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PurchasesTable } from '@/components/purchases/PurchasesTable';
import { AccountLayout } from '@/components/account/AccountLayout';

export default async function PurchasesPage() {
  const auth0 = await getAuth0Client();
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    redirect('/api/auth/login');
  }

  const userId = session.user.sub;

  const orders = await prisma.order.findMany({
    where: {
      buyerId: userId,
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // Increased limit for table
  });

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold">Your Purchases</h1>
          <p className="text-muted-foreground">View your payment history</p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground mb-6 text-lg">No purchases yet</p>
              <Button asChild>
                <Link href="/test-stripe">Make a test payment →</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <PurchasesTable orders={orders} />
        )}
      </div>
    </AccountLayout>
  );
}
