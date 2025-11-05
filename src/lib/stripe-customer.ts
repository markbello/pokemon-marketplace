import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { updateStripeCustomerId } from './user';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

/**
 * Get or create Stripe Customer for a user
 * Checks database first, then creates in Stripe if needed
 * Stores Customer ID in database for future use
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string | null
): Promise<string> {
  // 1. Check if user already has a Stripe Customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    // Verify the customer still exists in Stripe
    try {
      await stripe.customers.retrieve(user.stripeCustomerId);
      return user.stripeCustomerId;
    } catch (error) {
      // Customer doesn't exist in Stripe, create a new one
      console.warn(`Stripe customer ${user.stripeCustomerId} not found, creating new one`);
    }
  }

  // 2. Create new Stripe Customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  });

  // 3. Store Customer ID in database
  await updateStripeCustomerId(userId, customer.id);

  return customer.id;
}

