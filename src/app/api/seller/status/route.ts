import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { getStripeAccountStatus } from '@/lib/stripe-connect';
import { getUserFromCache } from '@/lib/user';

/**
 * Get seller verification status
 * GET /api/seller/status
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;

    // Get user from database
    const user = await getUserFromCache(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If no Stripe account, return not onboarded status
    if (!user.stripeAccountId) {
      return NextResponse.json({
        hasAccount: false,
        isVerified: false,
        status: null,
      });
    }

    // Get verification status from Stripe
    const status = await getStripeAccountStatus(user.stripeAccountId);

    if (!status) {
      return NextResponse.json({
        hasAccount: true,
        isVerified: false,
        status: null,
        error: 'Unable to retrieve account status from Stripe',
      });
    }

    return NextResponse.json({
      hasAccount: true,
      isVerified: status.isVerified,
      status,
    });
  } catch (error) {
    console.error('Error checking seller status:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to check seller status' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

