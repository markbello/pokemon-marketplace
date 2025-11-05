import { getUserFromCache } from './user';
import { isStripeAccountVerified } from './stripe-connect';

/**
 * Check if a user can sell (has verified Stripe Connect account)
 */
export async function canSell(userId: string): Promise<boolean> {
  const user = await getUserFromCache(userId);

  if (!user?.stripeAccountId) {
    return false;
  }

  return await isStripeAccountVerified(user.stripeAccountId);
}

/**
 * Check if a user has started seller onboarding (has Stripe account, verified or not)
 */
export async function hasSellerAccount(userId: string): Promise<boolean> {
  const user = await getUserFromCache(userId);
  return !!user?.stripeAccountId;
}

/**
 * Get seller access information for a user
 */
export async function getSellerAccessInfo(userId: string) {
  const user = await getUserFromCache(userId);

  if (!user?.stripeAccountId) {
    return {
      hasAccount: false,
      isVerified: false,
      canSell: false,
    };
  }

  const isVerified = await isStripeAccountVerified(user.stripeAccountId);

  return {
    hasAccount: true,
    isVerified,
    canSell: isVerified,
    accountId: user.stripeAccountId,
  };
}

