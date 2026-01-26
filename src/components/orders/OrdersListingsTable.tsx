'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Truck, Pencil, ArrowUpRight } from 'lucide-react';
import { ShippingModal } from './ShippingModal';
import { SlabImage } from '@/components/cards/SlabImage';

export interface OrderListingItem {
  id: string;
  displayTitle: string;
  sellerNotes?: string | null;
  askingPriceCents: number;
  currency: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SOLD' | 'PAID' | 'PENDING' | 'CANCELLED' | 'REFUNDED';
  imageUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
  // Sale/order info
  soldAt?: string | null;
  orderId?: string | null;
  buyerName?: string | null;
  buyerOrSellerName?: string | null; // For buyer view: seller name, for seller view: buyer name
  saleTotalCents?: number | null;
  // Shipping info
  orderShippingCarrier?: string | null;
  orderTrackingNumber?: string | null;
  orderFulfillmentStatus?: string | null;
  isTestPayment?: boolean;
  // Card details for collection-style display
  cardName?: string | null;
  setName?: string | null;
  cardNumber?: string | null;
  variety?: string | null;
}

interface OrdersListingsTableProps {
  items: OrderListingItem[];
  mode: 'buyer' | 'seller';
  onEditListing?: (item: OrderListingItem) => void;
  onShippingSuccess?: () => void;
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

export function OrdersListingsTable({
  items,
  mode,
  onEditListing,
  onShippingSuccess,
}: OrdersListingsTableProps) {
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [selectedOrderForShipping, setSelectedOrderForShipping] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);

  const openShippingModal = (orderId: string) => {
    setSelectedOrderForShipping({
      orderId,
      orderNumber: orderId.slice(-8).toUpperCase(),
    });
    setShippingModalOpen(true);
  };

  const handleShippingSuccess = () => {
    onShippingSuccess?.();
  };

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4">
        <p className="text-sm font-medium">
          {mode === 'buyer'
            ? "You haven't made any purchases yet."
            : "You haven't listed any items yet."}
        </p>
        <p className="text-muted-foreground text-sm">
          {mode === 'buyer'
            ? 'Your purchase history will appear here once you buy something.'
            : 'Create your first listing to start selling.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4">{mode === 'buyer' ? 'Item' : 'Title'}</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Activity</th>
              <th className="py-2 pl-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSold = item.status === 'SOLD' || item.status === 'PAID';
              const hasTracking = item.orderShippingCarrier && item.orderTrackingNumber;
              const needsShipping = mode === 'seller' && isSold && !hasTracking && item.orderId;

              return (
                <tr key={item.id} className="border-b last:border-0">
                  {/* Title/Item with Thumbnail */}
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail using SlabImage */}
                      {item.imageUrl && (
                        <div className="w-8 shrink-0">
                          <SlabImage
                            src={item.imageUrl}
                            alt={item.cardName || item.displayTitle}
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {/* Collection-style title: Card Name on top, then variety | set | number */}
                        <div className="font-medium line-clamp-1">
                          {item.cardName || item.displayTitle}
                        </div>
                        {item.cardName && (item.variety || item.setName || item.cardNumber) && (
                          <div className="text-muted-foreground text-xs line-clamp-1">
                            {item.variety && <span>{item.variety}</span>}
                            {item.variety && (item.setName || item.cardNumber) && (
                              <span className="mx-1">|</span>
                            )}
                            {item.setName && <span>{item.setName}</span>}
                            {item.cardNumber && <span className="ml-1">#{item.cardNumber}</span>}
                          </div>
                        )}
                        {item.sellerNotes && (
                          <div className="text-muted-foreground line-clamp-1 text-xs">
                            {item.sellerNotes}
                          </div>
                        )}
                        {isSold && item.buyerOrSellerName && (
                          <div className="mt-0.5 text-xs text-green-600">
                            {mode === 'buyer'
                              ? `Sold by ${item.buyerOrSellerName}`
                              : `Sold to ${item.buyerOrSellerName}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-2 pr-4">
                    <div>
                      {(item.askingPriceCents / 100).toLocaleString('en-US', {
                        style: 'currency',
                        currency: item.currency || 'USD',
                      })}
                    </div>
                    {isSold &&
                      item.saleTotalCents &&
                      item.saleTotalCents !== item.askingPriceCents && (
                        <div className="text-muted-foreground text-xs">
                          Total:{' '}
                          {(item.saleTotalCents / 100).toLocaleString('en-US', {
                            style: 'currency',
                            currency: item.currency || 'USD',
                          })}
                        </div>
                      )}
                  </td>

                  {/* Status */}
                  <td className="py-2 pr-4">
                    {mode === 'seller' && (
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          item.status === 'PUBLISHED'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'DRAFT'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {item.status === 'SOLD'
                          ? '✓ Sold'
                          : item.status === 'PUBLISHED'
                            ? 'Published'
                            : 'Draft'}
                      </span>
                    )}
                    {mode === 'buyer' && (
                      <div className="space-y-1">
                        {/* Payment Status */}
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            item.status === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.status === 'PAID'
                            ? '✓ Paid'
                            : item.status === 'PENDING'
                              ? '⏳ Pending'
                              : item.status === 'CANCELLED'
                                ? '○ Cancelled'
                                : '✗ Refunded'}
                        </span>
                        {/* Fulfillment Status */}
                        {item.orderFulfillmentStatus &&
                          item.orderFulfillmentStatus !== 'PENDING' && (
                            <div className="block text-xs font-medium">
                              {item.orderFulfillmentStatus === 'DELIVERED' && (
                                <span className="text-green-600">✓ Delivered</span>
                              )}
                              {(item.orderFulfillmentStatus === 'SHIPPED' ||
                                item.orderFulfillmentStatus === 'IN_TRANSIT' ||
                                item.orderFulfillmentStatus === 'OUT_FOR_DELIVERY') && (
                                <span className="text-gray-600">🚚 In Transit</span>
                              )}
                              {item.orderFulfillmentStatus === 'EXCEPTION' && (
                                <span className="text-red-600">⚠️ Exception</span>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </td>

                  {/* Activity */}
                  <td className="py-2 pr-4">
                    <div className="space-y-1">
                      {/* Show most recent event only */}
                      {isSold &&
                      item.orderFulfillmentStatus &&
                      item.orderFulfillmentStatus !== 'PENDING' ? (
                        <>
                          <span className="block text-xs font-medium">
                            {item.orderFulfillmentStatus === 'DELIVERED' && (
                              <span className="text-green-600">✓ Delivered</span>
                            )}
                            {(item.orderFulfillmentStatus === 'SHIPPED' ||
                              item.orderFulfillmentStatus === 'IN_TRANSIT' ||
                              item.orderFulfillmentStatus === 'OUT_FOR_DELIVERY') && (
                              <span className="text-gray-600">🚚 In Transit</span>
                            )}
                            {item.orderFulfillmentStatus === 'EXCEPTION' && (
                              <span className="text-red-600">⚠️ Exception</span>
                            )}
                          </span>
                          {item.soldAt && (
                            <span className="text-muted-foreground block text-xs">
                              {new Date(item.soldAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          {hasTracking && (
                            <a
                              href={getTrackingUrl(
                                item.orderShippingCarrier!,
                                item.orderTrackingNumber!,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Track package
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground block text-xs">
                          {isSold && item.soldAt ? (
                            <>
                              {mode === 'buyer' ? 'Purchased' : 'Sold'}{' '}
                              {new Date(item.soldAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </>
                          ) : (
                            <>
                              Listed{' '}
                              {new Date(item.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </>
                          )}
                        </span>
                      )}
                      {item.isTestPayment && (
                        <span className="block text-xs text-blue-600">Test Order</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-2 pl-4 text-right">
                    {mode === 'buyer' ? (
                      // Buyer: Simple "View Order" button
                      <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                        <Link href={`/orders/${item.id}`}>
                          <Eye className="mr-1 h-3 w-3" />
                          View Order
                        </Link>
                      </Button>
                    ) : isSold && item.orderId && !needsShipping ? (
                      // Seller: Sold & shipped - Simple "View Order" button
                      <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                        <Link href={`/orders/${item.orderId}`}>
                          <Eye className="mr-1 h-3 w-3" />
                          View Order
                        </Link>
                      </Button>
                    ) : (
                      // Seller: Context menu for multiple options
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isSold && item.orderId ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/orders/${item.orderId}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Order
                                </Link>
                              </DropdownMenuItem>
                              {needsShipping && (
                                <DropdownMenuItem onClick={() => openShippingModal(item.orderId!)}>
                                  <Truck className="mr-2 h-4 w-4" />
                                  Ship Order
                                </DropdownMenuItem>
                              )}
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => onEditListing?.(item)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Listing
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Shipping Modal (seller only) */}
      {mode === 'seller' && selectedOrderForShipping && (
        <ShippingModal
          orderId={selectedOrderForShipping.orderId}
          orderNumber={selectedOrderForShipping.orderNumber}
          open={shippingModalOpen}
          onOpenChange={setShippingModalOpen}
          onSuccess={handleShippingSuccess}
        />
      )}
    </>
  );
}
