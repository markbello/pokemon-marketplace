import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth0 } from '@/lib/auth0';
import { ListingBuyButton } from '@/components/listings/ListingBuyButton';

interface SellerListingsPageProps {
  params: { sellerId: string };
}

export default async function SellerListingsPage({ params }: SellerListingsPageProps) {
  const { sellerId } = params;

  // Fetch seller user for basic display information
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
  });

  if (!seller) {
    notFound();
  }

  // If the viewer is the seller, send them to their dashboard instead
  const session = await auth0.getSession();
  if (session?.user?.sub === sellerId) {
    redirect('/account/seller');
  }

  const listings = await prisma.listing.findMany({
    where: {
      sellerId,
      status: 'PUBLISHED',
    },
    orderBy: { createdAt: 'desc' },
  });

  const sellerDisplayName = seller.displayName || 'Seller';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">{sellerDisplayName}&apos;s listings</h1>
        <p className="text-muted-foreground">
          Browse items this seller has listed for sale. Each listing represents a single physical item.
        </p>
      </div>

      {listings.length === 0 ? (
        <p className="text-muted-foreground">This seller currently has no published listings.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="border bg-card text-card-foreground flex flex-col overflow-hidden rounded-xl shadow-sm"
            >
              <div className="bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.imageUrl || '/kado-placeholder.jpg'}
                  alt={listing.displayTitle}
                  className="aspect-[4/3] w-full object-contain"
                />
              </div>
              <div className="flex flex-1 flex-col space-y-2 p-4">
                <h2 className="line-clamp-2 text-base font-semibold">{listing.displayTitle}</h2>
                {listing.sellerNotes && (
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {listing.sellerNotes}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <div className="font-semibold">
                    {(listing.askingPriceCents / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: listing.currency || 'USD',
                    })}
                  </div>
                  <ListingBuyButton listingId={listing.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


