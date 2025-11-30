import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth0 } from '@/lib/auth0';

/**
 * Listing Purchase Success Page (PM-39 - Read-Only)
 *
 * This page displays the purchase confirmation AFTER payment.
 * It does NOT update any state - the webhook is the sole source of truth.
 *
 * The webhook handler (checkout.session.completed) is responsible for:
 * - Marking the order as PAID
 * - Marking the listing as SOLD
 */

export default async function ListingPurchaseSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ orderId?: string; session_id?: string }>;
}) {
  const { listingId } = await params;
  const { orderId } = await searchParams;

  if (!orderId) {
    notFound();
  }

  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    redirect('/api/auth/login');
  }

  const buyerId = session.user.sub;

  // Read-only: Just fetch the current state, don't update anything
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: true },
  });

  if (!order || order.buyerId !== buyerId || order.listingId !== listingId) {
    notFound();
  }

  const listing = order.listing;

  const displayTitle = order.snapshotListingDisplayTitle ?? listing?.displayTitle ?? 'Listing';
  const imageUrl = order.snapshotListingImageUrl ?? listing?.imageUrl ?? null;
  const priceCents = order.snapshotListingPriceCents ?? order.totalCents ?? 0;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="mb-2 text-3xl font-bold text-green-600">Purchase complete!</h1>
        <p className="text-muted-foreground">
          Thanks for your purchase. We&apos;ve recorded your order and marked this listing as sold.
        </p>
      </div>

      <div className="bg-card text-card-foreground overflow-hidden rounded-lg border shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          {imageUrl && (
            <div className="sm:w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={displayTitle}
                className="h-40 w-full rounded-md object-cover"
              />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-semibold">{displayTitle}</h2>
            <div className="text-muted-foreground text-sm">
              Order ID: <span className="font-mono">{order.id}</span>
            </div>
            <div className="mt-4 text-lg font-semibold">
              {(priceCents / 100).toLocaleString('en-US', {
                style: 'currency',
                currency: order.currency || 'USD',
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <a
          href="/purchases"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors"
        >
          View all purchases
        </a>
        <a
          href={`/seller/${listingId}/listings`}
          className="text-foreground hover:bg-accent inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm"
        >
          Back to seller&apos;s listings
        </a>
      </div>
    </div>
  );
}
