import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/currency';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormattedDate } from '@/components/FormattedDate';

export default async function PurchasesPage() {
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
    take: 50, // Pagination later
  });

  type OrderType = (typeof orders)[0];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
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
        <div className="space-y-4">
          {orders.map((order: OrderType) => (
            <Card key={order.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2 text-xl">Order #{order.id.slice(-8)}</CardTitle>
                    <CardDescription className="mb-2 text-base">
                      {order.description}
                    </CardDescription>
                    <p className="text-muted-foreground mb-2 text-sm">
                      <FormattedDate
                        date={order.createdAt}
                        purchaseTimezone={order.purchaseTimezone}
                      />
                    </p>
                    {order.sellerName && (
                      <p className="text-muted-foreground text-sm">Sold by: {order.sellerName}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-2xl font-bold">
                      {formatCurrency(order.amountCents, order.currency)}
                    </div>

                    <Badge
                      variant={
                        order.status === 'PAID'
                          ? 'default'
                          : order.status === 'PENDING'
                            ? 'secondary'
                            : order.status === 'CANCELLED'
                              ? 'secondary'
                              : 'destructive'
                      }
                      className={
                        order.status === 'PAID'
                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                          : order.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                            : ''
                      }
                    >
                      {order.status === 'PAID'
                        ? '✓ Paid'
                        : order.status === 'PENDING'
                          ? '⏳ Pending'
                          : order.status === 'CANCELLED'
                            ? '○ Cancelled'
                            : '✗ Refunded'}
                    </Badge>

                    {order.isTestPayment && (
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
                        Test Payment
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/test-stripe">Back to Test Payment</Link>
        </Button>
      </div>
    </div>
  );
}
