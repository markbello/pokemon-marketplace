'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ListingBuyButtonProps {
  listingId: string;
}

export function ListingBuyButton({ listingId }: ListingBuyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const router = useRouter();

  const startCheckout = async (emailOverride?: string) => {
    try {
      setIsLoading(true);
      const timezone =
        typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

      const response = await fetch(`/api/listings/${listingId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailOverride ? { timezone, emailOverride } : { timezone }),
      });

      if (response.status === 401) {
        // Not authenticated – send to Auth0 login
        window.location.href = '/api/auth/login';
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (response.status === 428 || data.code === 'EMAIL_REQUIRED') {
        setIsLoading(false);
        setEmailDialogOpen(true);
        return;
      }

      if (!response.ok || !data.url) {
        const errorMessage = data.error || 'Unable to start checkout for this listing.';
        console.error('[ListingBuyButton] Checkout error:', errorMessage);
        // Basic alert for now; can be replaced with toasts later
        alert(errorMessage);
        setIsLoading(false);
        return;
      }

      window.location.href = data.url as string;
    } catch (error) {
      console.error('[ListingBuyButton] Unexpected error:', error);
      alert('Something went wrong starting checkout. Please try again.');
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    const email = emailInput.trim();
    if (!email) {
      setEmailError('Please enter your email');
      return;
    }

    setIsSavingEmail(true);
    try {
      const res = await fetch('/api/user/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailError(data.error || 'Failed to save email');
        setIsSavingEmail(false);
        return;
      }

      setEmailDialogOpen(false);
      setIsSavingEmail(false);
      // Retry checkout with the new email
      await startCheckout(email);
    } catch (error) {
      console.error('[ListingBuyButton] Error saving email', error);
      setEmailError('Unexpected error. Please try again.');
      setIsSavingEmail(false);
    }
  };

  return (
    <>
      <Button size="sm" className="px-3" onClick={() => startCheckout()} disabled={isLoading}>
        {isLoading ? 'Redirecting…' : 'Buy now'}
      </Button>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add your email to continue</DialogTitle>
            <DialogDescription>
              We need an email address to send your receipt and order updates.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <div className="space-y-2">
              <Label htmlFor="checkout-email">Email</Label>
              <Input
                id="checkout-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                required
              />
              {emailError ? <p className="text-destructive text-sm">{emailError}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingEmail}>
                {isSavingEmail ? 'Saving…' : 'Save and continue'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
