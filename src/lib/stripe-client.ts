import Stripe from 'stripe';
import { getStripeSecrets, detectAppEnvironment } from './env';

const appEnv = detectAppEnvironment();
const { secretKey } = getStripeSecrets(appEnv);

export const stripe = new Stripe(secretKey, {
  apiVersion: '2025-10-29.clover',
});
