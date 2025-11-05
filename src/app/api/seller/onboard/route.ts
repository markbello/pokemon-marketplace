import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { createStripeConnectAccount } from '@/lib/stripe-connect';
import { getOrCreateUser } from '@/lib/user';

/**
 * Initiate seller onboarding by creating a Stripe Connect Express account
 * and returning an onboarding link
 * POST /api/seller/onboard
 */
export async function POST() {
  try {
    // Check authentication
    const session = await auth0.getSession();

    if (!session?.user?.sub || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;
    const email = session.user.email;

    // Ensure user exists in database
    await getOrCreateUser(userId);

    // Create Stripe Connect account and get onboarding link
    const { accountId, onboardingUrl } = await createStripeConnectAccount(userId, email);

    return NextResponse.json({
      accountId,
      onboardingUrl,
    });
  } catch (error) {
    console.error('Error initiating seller onboarding:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to initiate seller onboarding' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

