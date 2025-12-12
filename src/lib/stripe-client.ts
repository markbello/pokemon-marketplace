import Stripe from 'stripe';
import { getStripeSecretKey } from '@/lib/env';

export const stripe = new Stripe(getStripeSecretKey(), {
  apiVersion: '2025-10-29.clover',
});
