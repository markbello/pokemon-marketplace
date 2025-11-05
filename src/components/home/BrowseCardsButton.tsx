'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

interface BrowseCardsButtonProps {
  isAuthenticated: boolean;
}

export function BrowseCardsButton({ isAuthenticated }: BrowseCardsButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleTestPurchase = async () => {
    if (!isAuthenticated) {
      router.push('/api/auth/login?returnTo=/');
      return;
    }

    setLoading(true);
    try {
      // Get user's timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const response = await fetch('/api/test-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(error instanceof Error ? error.message : 'Failed to create checkout session');
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Button onClick={handleTestPurchase} className="w-full" variant="outline">
        Sign In to Test Purchase
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleTestPurchase} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Test Purchase ($1)
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        Use test card: 4242 4242 4242 4242
      </p>
    </div>
  );
}

