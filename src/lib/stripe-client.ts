import Stripe from 'stripe';
import { getStripeSecretKey } from '@/lib/env';

export function getStripe(hostnameOverride?: string) {
  return new Stripe(getStripeSecretKey(hostnameOverride), {
    apiVersion: '2025-10-29.clover',
  });
}
