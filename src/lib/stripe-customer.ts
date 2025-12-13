import { prisma } from '@/lib/prisma';
import { updateStripeCustomerId } from './user';
import { getStripeClient } from './stripe-client';

/**
 * Get or create Stripe Customer for a user
 * Checks database first, then creates in Stripe if needed
 * Stores Customer ID in database for future use
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string | null,
): Promise<string> {
  const stripe = await getStripeClient();

  // 1. Check if user already has a Stripe Customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    // Verify the customer still exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (customer.deleted) {
        throw new Error('Stripe customer deleted');
      }

      // If email is missing or differs, update it so receipts/communications work
      const desiredEmail = email || undefined;
      const desiredName = name || undefined;
      const needsUpdate =
        (desiredEmail && customer.email !== desiredEmail) ||
        (desiredName && customer.name !== desiredName);

      if (needsUpdate) {
        await stripe.customers.update(user.stripeCustomerId, {
          email: desiredEmail,
          name: desiredName,
        });
      }

      return user.stripeCustomerId;
    } catch {
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
