'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Package, Truck } from 'lucide-react';
import { ShippingModal } from './ShippingModal';

interface ShippingPromptBannerProps {
  orderId: string;
  orderNumber: string;
  isStaging: boolean;
  hasShippingAddress: boolean;
}

export function ShippingPromptBanner({
  orderId,
  orderNumber,
  isStaging,
  hasShippingAddress,
}: ShippingPromptBannerProps) {
  const [shippingModalOpen, setShippingModalOpen] = useState(false);

  const handleShippingSuccess = () => {
    // Refresh the page to show updated shipping info
    window.location.reload();
  };

  return (
    <>
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <Package className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Action Required: Ship This Order</AlertTitle>
        <AlertDescription className="text-blue-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              This order has been paid and is ready to ship. Click the button to enter shipping
              information and notify the buyer.
              {!hasShippingAddress && (
                <span className="mt-2 block font-medium text-amber-700">
                  ⚠️ Shipping address not available. Contact buyer for shipping details.
                </span>
              )}
            </div>
            <Button
              onClick={() => setShippingModalOpen(true)}
              className="shrink-0 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Truck className="mr-2 h-4 w-4" />
              Ship Order
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <ShippingModal
        orderId={orderId}
        orderNumber={orderNumber}
        isStaging={isStaging}
        open={shippingModalOpen}
        onOpenChange={setShippingModalOpen}
        onSuccess={handleShippingSuccess}
      />
    </>
  );
}
