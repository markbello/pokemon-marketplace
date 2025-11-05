import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 text-6xl">✅</div>
          <h1 className="mb-4 text-3xl font-bold text-green-600 dark:text-green-500">
            Payment Successful!
          </h1>
          <p className="mb-2 text-lg text-muted-foreground">
            Your test payment has been processed.
          </p>
          <p className="mb-8 text-sm text-muted-foreground">
            Check your Stripe dashboard: <strong>Payments</strong> → Look for $1.00 transaction
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/test-stripe">Test Another Payment</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

