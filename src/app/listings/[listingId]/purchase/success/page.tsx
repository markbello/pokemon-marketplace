import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth0 } from '@/lib/auth0';
import { logAuditEvent } from '@/lib/audit';

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

  // Confirm order and listing and mark them appropriately
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.buyerId !== buyerId || order.listingId !== listingId) {
      throw new Error('Order not found or does not belong to current user');
    }

    // Load listing, but tolerate missing listing in case of schema changes
    const listing = order.listingId
      ? await tx.listing.findUnique({ where: { id: order.listingId } })
      : null;

    // Update order if still pending
    const updatedOrder =
      order.status === 'PAID'
        ? order
        : await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'PAID',
              updatedAt: new Date(),
            },
          });

    // Mark listing sold if it is still published
    if (listing && listing.status === 'PUBLISHED') {
      await tx.listing.update({
        where: { id: listing.id },
        data: {
          status: 'SOLD',
        },
      });
    }

    return { order: updatedOrder, listing };
  });

  // Log audit event (outside transaction)
  await logAuditEvent({
    entityType: 'Order',
    entityId: orderId,
    action: 'PAYMENT_COMPLETED_REDIRECT',
    userId: buyerId,
    changes: {
      status: 'PAID',
      listingId,
    },
    metadata: {
      source: 'redirect_success',
    },
  });

  const { order, listing } = result;

  const displayTitle = order.snapshotListingDisplayTitle ?? listing?.displayTitle ?? 'Listing';
  const imageUrl = order.snapshotListingImageUrl ?? listing?.imageUrl ?? null;
  const priceCents = order.snapshotListingPriceCents ?? order.amountCents ?? 0;

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
