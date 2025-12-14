import { getAuth0Client } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  OrdersListingsTable,
  type OrderListingItem,
} from '@/components/orders/OrdersListingsTable';
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
    take: 100,
    include: {
      listing: {
        select: {
          imageUrl: true,
        },
      },
    },
  });

  // Map orders to OrderListingItem format
  const items: OrderListingItem[] = orders.map((order) => ({
    id: order.id,
    displayTitle: order.snapshotListingDisplayTitle || order.description,
    askingPriceCents: order.snapshotListingPriceCents || order.subtotalCents,
    currency: order.currency,
    status: order.status as 'PAID' | 'PENDING' | 'CANCELLED' | 'REFUNDED',
    imageUrl: order.snapshotListingImageUrl || order.listing?.imageUrl,
    createdAt: order.createdAt.toISOString(),
    soldAt: order.createdAt.toISOString(),
    orderId: order.id,
    buyerOrSellerName: order.sellerName,
    saleTotalCents: order.totalCents,
    orderShippingCarrier: order.shippingCarrier,
    orderTrackingNumber: order.trackingNumber,
    orderFulfillmentStatus: order.fulfillmentStatus,
    isTestPayment: order.isTestPayment,
  }));

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold">Your Purchases</h1>
          <p className="text-muted-foreground">View your order history and track shipments</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-6 text-lg">No purchases yet</p>
                <Button asChild>
                  <Link href="/test-stripe">Make a test payment →</Link>
                </Button>
              </div>
            ) : (
              <OrdersListingsTable items={items} mode="buyer" />
            )}
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
}
