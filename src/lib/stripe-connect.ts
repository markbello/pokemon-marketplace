import { prisma } from '@/lib/prisma';
import { updateStripeAccountId } from './user';
import { getBaseUrl } from './server-utils';
import { getStripeClient } from './stripe-client';

/**
 * Stripe Connect Express account verification status
 */
export interface StripeAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  isVerified: boolean;
}

/**
 * Check if a Stripe Connect Express account is verified and ready to accept payments
 * Account is considered verified when both charges and payouts are enabled
 */
export async function isStripeAccountVerified(accountId: string): Promise<boolean> {
  try {
    const stripe = await getStripeClient();
    const account = await stripe.accounts.retrieve(accountId);
    return account.charges_enabled === true && account.payouts_enabled === true;
  } catch (error) {
    console.error(`Error checking Stripe account ${accountId}:`, error);
    return false;
  }
}

/**
 * Get detailed verification status of a Stripe Connect Express account
 */
export async function getStripeAccountStatus(
  accountId: string,
): Promise<StripeAccountStatus | null> {
  try {
    const stripe = await getStripeClient();
    const account = await stripe.accounts.retrieve(accountId);

    return {
      accountId: account.id,
      chargesEnabled: account.charges_enabled === true,
      payoutsEnabled: account.payouts_enabled === true,
      detailsSubmitted: account.details_submitted === true,
      isVerified: account.charges_enabled === true && account.payouts_enabled === true,
    };
  } catch (error) {
    console.error(`Error retrieving Stripe account ${accountId}:`, error);
    return null;
  }
}

/**
 * Create a Stripe Connect Express account for a seller
 * This creates the account in Stripe and stores the account ID in our database
 */
export async function createStripeConnectAccount(
  userId: string,
  email: string,
): Promise<{ accountId: string; onboardingUrl: string }> {
  const stripe = await getStripeClient();

  // Check if user already has a Stripe Connect account
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeAccountId: true },
  });

  if (user?.stripeAccountId) {
    // Account already exists, create onboarding link for existing account
    const baseUrl = await getBaseUrl();
    const accountLink = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${baseUrl}/account/seller?refresh=true`,
      return_url: `${baseUrl}/account/seller?return=true`,
      type: 'account_onboarding',
    });

    return {
      accountId: user.stripeAccountId,
      onboardingUrl: accountLink.url,
    };
  }

  // Create new Stripe Connect Express account
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    metadata: {
      userId,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  // Store account ID in database
  await updateStripeAccountId(userId, account.id);

  // Create onboarding link
  const baseUrl = await getBaseUrl();
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${baseUrl}/account/seller?refresh=true`,
    return_url: `${baseUrl}/account/seller?return=true`,
    type: 'account_onboarding',
  });

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
}

/**
 * Create a login link for sellers to access their Stripe Express Dashboard
 */
export async function createStripeDashboardLink(accountId: string): Promise<string> {
  const stripe = await getStripeClient();
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}

/**
 * Get all seller accounts with their verification status
 * Useful for admin interface
 */
export async function getAllSellerAccounts() {
  const sellers = await prisma.user.findMany({
    where: {
      stripeAccountId: {
        not: null,
      },
    },
    select: {
      id: true,
      displayName: true,
      stripeAccountId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Get verification status for each seller
  const sellersWithStatus = await Promise.all(
    sellers.map(async (seller) => {
      if (!seller.stripeAccountId) {
        return null;
      }

      const status = await getStripeAccountStatus(seller.stripeAccountId);

      return {
        ...seller,
        verificationStatus: status,
      };
    }),
  );

  return sellersWithStatus.filter((seller) => seller !== null);
}
