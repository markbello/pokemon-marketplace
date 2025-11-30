import { auth0 } from '@/lib/auth0';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOrderAddresses, formatAddress } from '@/lib/stripe-addresses';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FormattedDate } from '@/components/FormattedDate';
import Link from 'next/link';
import { ArrowLeft, Package, CreditCard, Truck, MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

function getStatusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          ✓ Paid
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          ⏳ Pending
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="secondary">○ Cancelled</Badge>
      );
    case 'REFUNDED':
      return (
        <Badge variant="destructive">✗ Refunded</Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    redirect('/api/auth/login');
  }

  const userId = session.user.sub;
  const { orderId } = await params;

  // Fetch order - allow access if user is buyer OR seller
  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      listing: true,
      buyer: {
        select: { displayName: true },
      },
    },
  });

  // Security check: user must be either the buyer or the seller
  if (!order || (order.buyerId !== userId && order.sellerId !== userId)) {
    notFound();
  }

  const isSeller = order.sellerId === userId;
  const isBuyer = order.buyerId === userId;

  // Fetch addresses from Stripe (privacy-by-design: addresses not stored locally)
  const addresses = await getOrderAddresses(order.id);

  // Get display amounts
  const subtotal = order.subtotalCents;
  const tax = order.taxCents;
  const shipping = order.shippingCents;
  const total = order.totalCents;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back link */}
      <Link
        href={isSeller ? '/account/seller' : '/account/purchases'}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {isSeller ? 'Back to Seller Dashboard' : 'Back to Purchases'}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {isSeller ? 'Sale' : 'Purchase'}
            </p>
            <h1 className="text-3xl font-bold mb-2">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-muted-foreground">
              {isSeller ? 'Sold' : 'Placed'} on{' '}
              <FormattedDate
                date={order.createdAt}
                purchaseTimezone={order.purchaseTimezone}
              />
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(order.status)}
            {order.isTestPayment && (
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-800"
              >
                Test
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Item(s) - Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Item
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                {/* Product Image */}
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {order.snapshotListingImageUrl ? (
                    <Image
                      src={order.snapshotListingImageUrl}
                      alt={order.snapshotListingDisplayTitle || 'Product'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {order.snapshotListingDisplayTitle || order.description}
                  </h3>
                  {isSeller ? (
                    <p className="text-sm text-muted-foreground">
                      Buyer: {order.buyer?.displayName || 'Unknown'}
                    </p>
                  ) : (
                    order.sellerName && (
                      <p className="text-sm text-muted-foreground">
                        Sold by: {order.sellerName}
                      </p>
                    )
                  )}
                  <p className="text-sm text-muted-foreground mt-1">Qty: 1</p>
                </div>

                {/* Price */}
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {formatCurrency(
                      order.snapshotListingPriceCents ?? order.subtotalCents,
                      order.currency
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Addresses Section */}
          {(addresses?.shipping || addresses?.billing) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Shipping Address */}
              {addresses?.shipping && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      {addresses.customerName && (
                        <p className="font-medium">{addresses.customerName}</p>
                      )}
                      {formatAddress(addresses.shipping).map((line, i) => (
                        <p key={i} className="text-muted-foreground">
                          {line}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Billing Address */}
              {addresses?.billing && !isSeller && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Billing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      {addresses.customerName && (
                        <p className="font-medium">{addresses.customerName}</p>
                      )}
                      {formatAddress(addresses.billing).map((line, i) => (
                        <p key={i} className="text-muted-foreground">
                          {line}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Seller Fulfillment Notice */}
          {isSeller && order.status === 'PAID' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required: Ship this item</AlertTitle>
              <AlertDescription>
                This order has been paid. Please ship the item to the buyer at the address shown above.
                {!addresses?.shipping && (
                  <span className="block mt-2 text-amber-600">
                    Note: Shipping address not available. Contact buyer for shipping details.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Sidebar - Order Summary */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal, order.currency)}</span>
              </div>

              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(tax, order.currency)}</span>
                </div>
              )}

              {shipping > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(shipping, order.currency)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg">
                  {formatCurrency(total, order.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(order.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{order.currency}</span>
              </div>
              {addresses?.customerEmail && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt sent to</span>
                  <span className="truncate max-w-[180px]">
                    {addresses.customerEmail}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order ID for reference */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Order ID</p>
              <p className="font-mono text-sm break-all">{order.id}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

