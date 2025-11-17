'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface ListingBuyButtonProps {
  listingId: string;
}

export function ListingBuyButton({ listingId }: ListingBuyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    try {
      setIsLoading(true);
      const timezone =
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined;

      const response = await fetch(`/api/listings/${listingId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone }),
      });

      if (response.status === 401) {
        // Not authenticated – send to Auth0 login
        window.location.href = '/api/auth/login';
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.url) {
        const errorMessage =
          data.error || 'Unable to start checkout for this listing.';
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

  return (
    <Button
      size="sm"
      className="px-3"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? 'Redirecting…' : 'Buy now'}
    </Button>
  );
}


