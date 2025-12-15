import { getAuth0Client } from '@/lib/auth0';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getOrderAddresses, formatAddress } from '@/lib/stripe-addresses';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FormattedDate } from '@/components/FormattedDate';
import { OrderHistory } from '@/components/orders/OrderHistory';
import { ShippingPromptBanner } from '@/components/orders/ShippingPromptBanner';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  CreditCard,
  Truck,
  MapPin,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

function getStatusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">✓ Paid</Badge>;
    case 'PENDING':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">⏳ Pending</Badge>
      );
    case 'CANCELLED':
      return <Badge variant="secondary">○ Cancelled</Badge>;
    case 'REFUNDED':
      return <Badge variant="destructive">✗ Refunded</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getFulfillmentBadge(status: string) {
  switch (status) {
    case 'DELIVERED':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">✓ Delivered</Badge>;
    case 'SHIPPED':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">🚚 Shipped</Badge>;
    case 'IN_TRANSIT':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">🚚 In Transit</Badge>;
    case 'OUT_FOR_DELIVERY':
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">🚚 Out for Delivery</Badge>
      );
    case 'EXCEPTION':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">⚠️ Exception</Badge>;
    case 'PROCESSING':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">📦 Processing</Badge>
      );
    default:
      return null;
  }
}

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const trackingUrls: Record<string, string> = {
    usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    dhl_express: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  };
  return trackingUrls[carrier] || `https://www.google.com/search?q=${trackingNumber}`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const auth0 = await getAuth0Client();
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
      events: {
        orderBy: { timestamp: 'asc' },
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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        href={isSeller ? '/account/seller' : '/account/purchases'}
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center text-sm"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {isSeller ? 'Back to Seller Dashboard' : 'Back to Purchases'}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground mb-1 text-sm">{isSeller ? 'Sale' : 'Purchase'}</p>
            <h1 className="mb-2 text-3xl font-bold">Order #{order.id.slice(-8).toUpperCase()}</h1>
            <p className="text-muted-foreground">
              {isSeller ? 'Sold' : 'Placed'} on{' '}
              <FormattedDate date={order.createdAt} purchaseTimezone={order.purchaseTimezone} />
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(order.status)}
            {order.fulfillmentStatus !== 'PENDING' && getFulfillmentBadge(order.fulfillmentStatus)}
            {order.isTestPayment && (
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
                Test
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Shipping Prompt Banner for Sellers */}
      {isSeller && order.status === 'PAID' && !order.shippingCarrier && !order.trackingNumber && (
        <ShippingPromptBanner
          orderId={order.id}
          orderNumber={order.id.slice(-8).toUpperCase()}
          hasShippingAddress={!!addresses?.shipping}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Item(s) - Main content */}
        <div className="space-y-6 lg:col-span-2">
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
                <div className="shrink-0">
                  <Image
                    src={order.snapshotListingImageUrl || '/kado-placeholder.jpg'}
                    alt={order.snapshotListingDisplayTitle || 'Product'}
                    width={112}
                    height={112}
                    className="border-border bg-muted/40 rounded-lg border object-contain p-2"
                  />
                </div>

                {/* Product Details */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-semibold">
                    {order.snapshotListingDisplayTitle || order.description}
                  </h3>
                  {isSeller ? (
                    <p className="text-muted-foreground text-sm">
                      Buyer: {order.buyer?.displayName || 'Unknown'}
                    </p>
                  ) : (
                    order.sellerName && (
                      <p className="text-muted-foreground text-sm">Sold by: {order.sellerName}</p>
                    )
                  )}
                  <p className="text-muted-foreground mt-1 text-sm">Qty: 1</p>
                </div>

                {/* Price */}
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {formatCurrency(
                      order.snapshotListingPriceCents ?? order.subtotalCents,
                      order.currency,
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address - Full Width */}
          {addresses?.shipping && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
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

          {/* Seller Tracking Information */}
          {isSeller && order.status === 'PAID' && order.shippingCarrier && order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Tracking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Status</span>
                  {getFulfillmentBadge(order.fulfillmentStatus)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Carrier</span>
                  <span className="font-medium">{order.shippingCarrier?.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Tracking #</span>
                  <span className="font-mono text-sm">{order.trackingNumber}</span>
                </div>
                {order.shippedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Shipped</span>
                    <span className="text-sm">
                      <FormattedDate
                        date={order.shippedAt}
                        purchaseTimezone={order.purchaseTimezone}
                      />
                    </span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Delivered</span>
                    <span className="text-sm">
                      <FormattedDate
                        date={order.deliveredAt}
                        purchaseTimezone={order.purchaseTimezone}
                      />
                    </span>
                  </div>
                )}
                <Separator />
                <a
                  href={getTrackingUrl(order.shippingCarrier!, order.trackingNumber!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  Track Package
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Buyer Tracking Information */}
          {isBuyer && order.shippingCarrier && order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping & Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Status</span>
                  {getFulfillmentBadge(order.fulfillmentStatus)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Carrier</span>
                  <span className="font-medium">{order.shippingCarrier.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Tracking #</span>
                  <span className="font-mono text-sm">{order.trackingNumber}</span>
                </div>
                {order.shippedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Shipped</span>
                    <span className="text-sm">
                      <FormattedDate
                        date={order.shippedAt}
                        purchaseTimezone={order.purchaseTimezone}
                      />
                    </span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Delivered</span>
                    <span className="text-sm">
                      <FormattedDate
                        date={order.deliveredAt}
                        purchaseTimezone={order.purchaseTimezone}
                      />
                    </span>
                  </div>
                )}
                <Separator />
                <a
                  href={getTrackingUrl(order.shippingCarrier, order.trackingNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  Track Your Package
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Order Summary & History */}
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
                <span className="text-lg">{formatCurrency(total, order.currency)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Order History Timeline */}
          <OrderHistory order={order} />
        </div>
      </div>
    </div>
  );
}
