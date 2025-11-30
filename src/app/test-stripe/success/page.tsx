import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string; listingId?: string }>;
}

/**
 * Test Payment Success Page (PM-39)
 *
 * This page displays the status of the order and listing AFTER payment.
 * It does NOT update any state - that's the webhook's job.
 *
 * This demonstrates:
 * - Webhook processed: Order=PAID, Listing=SOLD
 * - Webhook pending: Order=PENDING, Listing=PUBLISHED (refresh to check again)
 */
export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    redirect('/api/auth/login');
  }

  const params = await searchParams;

  // Fetch current state - we do NOT update anything, just display
  let order = null;
  let listing = null;
  let webhookProcessed = false;

  if (params.orderId) {
    order = await prisma.order.findUnique({
      where: { id: params.orderId },
      select: {
        id: true,
        status: true,
        listingId: true,
        snapshotListingDisplayTitle: true,
        totalCents: true,
        currency: true,
      },
    });

    // Check if the webhook has processed this order
    webhookProcessed = order?.status === 'PAID';

    // Fetch listing status if we have one
    if (order?.listingId) {
      listing = await prisma.listing.findUnique({
        where: { id: order.listingId },
        select: { id: true, status: true, displayTitle: true },
      });
    }
  }

  const orderStatusColor = order?.status === 'PAID' ? 'bg-green-500' : 'bg-yellow-500';
  const listingStatusColor = listing?.status === 'SOLD' ? 'bg-green-500' : 'bg-yellow-500';

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 text-6xl">{webhookProcessed ? '✅' : '⏳'}</div>
          <h1 className="mb-4 text-3xl font-bold text-green-600 dark:text-green-500">
            Payment Successful!
          </h1>

          {/* Webhook Status Indicator */}
          <div className="bg-card mb-6 rounded-lg border p-4 text-left">
            <h2 className="mb-3 text-lg font-semibold">Webhook Processing Status (PM-39)</h2>

            {order ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Order Status:</span>
                  <Badge className={orderStatusColor}>{order.status}</Badge>
                </div>

                {listing && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Listing Status:</span>
                    <Badge className={listingStatusColor}>{listing.status}</Badge>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Webhook Processed:</span>
                  <Badge variant={webhookProcessed ? 'default' : 'secondary'}>
                    {webhookProcessed ? 'Yes ✓' : 'Pending...'}
                  </Badge>
                </div>

                {!webhookProcessed && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    The webhook hasn&apos;t processed yet. Make sure the Stripe CLI is running:
                    <code className="bg-muted ml-1 rounded px-1 py-0.5 text-xs">
                      stripe listen --forward-to localhost:3000/api/webhooks/stripe
                    </code>
                  </p>
                )}

                <div className="text-muted-foreground mt-3 border-t pt-3 text-xs">
                  <div>
                    Order ID: <code>{order.id}</code>
                  </div>
                  {listing && (
                    <div>
                      Listing ID: <code>{listing.id}</code>
                    </div>
                  )}
                  {order.snapshotListingDisplayTitle && (
                    <div>Item: {order.snapshotListingDisplayTitle}</div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No order found</p>
            )}
          </div>

          <p className="text-muted-foreground mb-8 text-sm">
            Check your terminal for webhook logs: <code>[Webhook] Listing marked as SOLD</code>
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
            {!webhookProcessed && (
              <Button asChild variant="outline" size="lg" className="animate-pulse">
                <Link
                  href={`/test-stripe/success?orderId=${params.orderId}&listingId=${params.listingId}`}
                >
                  Check Webhook Status
                </Link>
              </Button>
            )}
            {webhookProcessed && order && (
              <Button asChild size="lg">
                <Link href={`/orders/${order.id}`}>View Order Details</Link>
              </Button>
            )}
            <Button asChild variant={webhookProcessed ? 'outline' : 'default'} size="lg">
              <Link href="/account/purchases">View Your Purchases</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/test-stripe">Test Another Payment</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
