import { prisma } from './prisma';
import { getManagementClient } from './auth0-management';

export async function updateUserEmail(auth0UserId: string, email: string) {
  const management = getManagementClient();
  return management.users.update({ id: auth0UserId }, { email, email_verified: false });
}

export async function updateUserPreferredEmail(auth0UserId: string, email: string) {
  const management = getManagementClient();
  return management.users.update(
    { id: auth0UserId },
    {
      user_metadata: {
        preferredEmail: email,
      },
    },
  );
}

type UserLike = {
  email?: string | null;
  user_metadata?: {
    preferredEmail?: string | null;
  };
};

export function getPreferredEmail(
  user: UserLike | null | undefined,
  sessionEmail?: string,
): string | undefined {
  return sessionEmail || user?.email || user?.user_metadata?.preferredEmail || undefined;
}

/**
 * Get Auth0 user data by user ID
 */
async function getAuth0User(auth0UserId: string) {
  const management = getManagementClient();
  const response = await management.users.get({ id: auth0UserId });
  const userData = response.data?.data || response.data || response;
  return userData;
}

/**
 * Get or create user, caching Auth0 data
 * Auth0 is the source of truth for user identity data
 */
export async function getOrCreateUser(auth0UserId: string) {
  // Get fresh data from Auth0 (source of truth)
  const auth0User = await getAuth0User(auth0UserId);

  // Update our cache with latest Auth0 data
  const dbUser = await prisma.user.upsert({
    where: { id: auth0UserId },
    update: {
      displayName: auth0User.user_metadata?.displayName || null,
      avatarUrl: auth0User.user_metadata?.picture || auth0User.picture || null,
    },
    create: {
      id: auth0UserId,
      displayName: auth0User.user_metadata?.displayName || null,
      avatarUrl: auth0User.user_metadata?.picture || auth0User.picture || null,
    },
  });

  return { ...auth0User, ...dbUser };
}

/**
 * Fast lookup from cache (for performance-critical operations)
 * Use this when you need quick access and can tolerate slightly stale data
 */
export async function getUserFromCache(auth0UserId: string) {
  return prisma.user.findUnique({
    where: { id: auth0UserId },
  });
}

/**
 * Update business data (Stripe, etc.)
 * This is for data that only exists in our database, not in Auth0
 */
export async function updateStripeCustomerId(auth0UserId: string, stripeCustomerId: string) {
  return prisma.user.update({
    where: { id: auth0UserId },
    data: { stripeCustomerId },
  });
}

/**
 * Update Stripe Connect Express account ID
 */
export async function updateStripeAccountId(auth0UserId: string, stripeAccountId: string) {
  return prisma.user.update({
    where: { id: auth0UserId },
    data: { stripeAccountId },
  });
}

/**
 * Get user by Stripe Customer ID
 */
export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  return prisma.user.findUnique({
    where: { stripeCustomerId },
  });
}

/**
 * Refresh cache from Auth0 (use when Auth0 data might be stale)
 * This fetches fresh data from Auth0 and updates our cache
 */
export async function refreshUserCache(auth0UserId: string) {
  const auth0User = await getAuth0User(auth0UserId);

  await prisma.user.update({
    where: { id: auth0UserId },
    data: {
      displayName: auth0User.user_metadata?.displayName || null,
      avatarUrl: auth0User.user_metadata?.picture || auth0User.picture || null,
    },
  });

  return auth0User;
}
