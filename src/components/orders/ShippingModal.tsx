'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { SUPPORTED_CARRIERS, TEST_SCENARIOS } from '@/lib/tracking-constants';

interface ShippingModalProps {
  orderId: string;
  orderNumber: string;
  isStaging: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ShippingModal({
  orderId,
  orderNumber,
  isStaging,
  open,
  onOpenChange,
  onSuccess,
}: ShippingModalProps) {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShipped, setIsShipped] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!carrier || !trackingNumber) {
      toast.error('Please select a carrier and enter a tracking number');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carrier,
          trackingNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to mark order as shipped');
      }

      setIsShipped(true);
      toast.success('Order marked as shipped! Tracking email sent to buyer.');

      // Wait a moment before closing and refreshing
      setTimeout(() => {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      }, 1500);
    } catch (error) {
      console.error('Error marking order as shipped:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to mark order as shipped');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      // Reset form when closing
      setCarrier('');
      setTrackingNumber('');
      setIsShipped(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ship Order #{orderNumber}
          </DialogTitle>
          <DialogDescription>
            Enter tracking information to notify the buyer that their order has shipped
          </DialogDescription>
        </DialogHeader>

        {isShipped ? (
          <div className="flex items-center gap-3 py-6 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <p className="font-semibold">Order marked as shipped!</p>
              <p className="text-muted-foreground text-sm">
                The buyer has been notified with tracking information.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* Carrier Selection */}
            <div>
              <label htmlFor="carrier" className="mb-2 block text-sm font-medium">
                Shipping Carrier
              </label>
              <select
                id="carrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="border-input bg-background flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm shadow-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={isSubmitting}
              >
                <option value="">Select carrier...</option>
                {SUPPORTED_CARRIERS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tracking Number / Test Scenario */}
            <div>
              <label htmlFor="tracking" className="mb-2 block text-sm font-medium">
                {isStaging ? 'Test Scenario' : 'Tracking Number'}
              </label>

              {isStaging ? (
                <>
                  <select
                    id="tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="border-input bg-background flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm shadow-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select test scenario...</option>
                    {TEST_SCENARIOS.map((scenario) => (
                      <option key={scenario.value} value={scenario.value}>
                        {scenario.label}
                      </option>
                    ))}
                  </select>
                  <Alert className="mt-3 border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      💡 Development mode: Select a test scenario to simulate tracking status
                      updates and emails
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <input
                  id="tracking"
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="border-input bg-background placeholder:text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter tracking number"
                  required
                  disabled={isSubmitting}
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!carrier || !trackingNumber || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Mark as Shipped
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
