'use client';

import { Button } from '@/components/ui/button';

export default function TestStripePage() {
  const handleTestPayment = async () => {
    try {
      const response = await fetch('/api/test-payment', {
        method: 'POST',
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
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-3xl font-bold">Stripe Connection Test</h1>
          <p className="mb-6 text-muted-foreground text-lg">
            Click the button to test a $1 payment through Stripe
          </p>
          <Button onClick={handleTestPayment} size="lg" className="text-base">
            Test $1 Payment
          </Button>
          <div className="mt-8 rounded-lg border bg-card p-6 text-left">
            <h2 className="mb-4 text-xl font-semibold">Test Card Information</h2>
            <p className="mb-2 text-sm text-muted-foreground">
              Use this test card in Stripe Checkout:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>Card Number:</strong> 4242 4242 4242 4242
              </li>
              <li>
                <strong>Expiry:</strong> Any future date (e.g., 12/34)
              </li>
              <li>
                <strong>CVC:</strong> Any 3 digits (e.g., 123)
              </li>
              <li>
                <strong>ZIP:</strong> Any 5 digits (e.g., 12345)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

