import Stripe from 'stripe';
import { getStripeSecretKey } from './env';

export const stripe = new Stripe(getStripeSecretKey(), {
  apiVersion: '2025-10-29.clover',
});
