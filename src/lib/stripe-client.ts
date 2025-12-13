import Stripe from 'stripe';
import { getStripeSecretKey } from './env';

let stripeInstance: Stripe | null = null;

/**
 * Gets or creates the Stripe client instance.
 * Must be called from server-side contexts (API routes, server components).
 */
export async function getStripeClient(): Promise<Stripe> {
  if (!stripeInstance) {
    const secretKey = await getStripeSecretKey();
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });
  }
  return stripeInstance;
}

// For backwards compatibility, export a getter
// Usage: const stripe = await getStripeClient();
export { getStripeClient as stripe };
