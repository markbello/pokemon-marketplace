import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    redirect('/api/auth/login');
  }

  const params = await searchParams;

  // If orderId is provided, check and update order status
  if (params.orderId) {
    console.log('[Success Page] Checking order:', params.orderId);
    try {
      const order = await prisma.order.findUnique({
        where: { id: params.orderId },
        select: { id: true, status: true, stripeSessionId: true },
      });

      console.log('[Success Page] Order found:', order);

      // If order exists and is still pending, check Stripe session status
      if (order && order.status === 'PENDING' && order.stripeSessionId) {
        console.log('[Success Page] Order is pending, checking Stripe session:', order.stripeSessionId);
        try {
          const checkoutSession = await stripe.checkout.sessions.retrieve(order.stripeSessionId);

          console.log('[Success Page] Checkout session payment status:', checkoutSession.payment_status);

          // If payment is complete, update order
          if (checkoutSession.payment_status === 'paid') {
            console.log('[Success Page] Payment is paid, updating order to PAID');
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: 'PAID',
                stripePaymentIntentId: checkoutSession.payment_intent as string | null,
                updatedAt: new Date(),
              },
            });
            console.log('[Success Page] Order updated to PAID successfully');
          } else {
            console.log('[Success Page] Payment status is not paid:', checkoutSession.payment_status);
          }
        } catch (err) {
          console.error('[Success Page] Error checking Stripe session:', err);
        }
      } else {
        console.log('[Success Page] Order not pending or missing session ID. Status:', order?.status, 'Session ID:', order?.stripeSessionId);
      }
    } catch (err) {
      console.error('[Success Page] Error checking order status:', err);
    }
  } else {
    console.log('[Success Page] No orderId in searchParams');
  }

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
              <Link href="/purchases">View Your Purchases</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
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

