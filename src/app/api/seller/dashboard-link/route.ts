import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { createStripeDashboardLink } from '@/lib/stripe-connect';
import { getUserFromCache } from '@/lib/user';

/**
 * Get a login link to Stripe Express Dashboard for sellers
 * POST /api/seller/dashboard-link
 */
export async function POST() {
  try {
    // Check authentication
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.sub;

    // Get user from database
    const user = await getUserFromCache(userId);

    if (!user?.stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account found. Please complete seller onboarding first.' },
        { status: 400 },
      );
    }

    // Create dashboard login link
    const dashboardUrl = await createStripeDashboardLink(user.stripeAccountId);

    return NextResponse.json({
      dashboardUrl,
    });
  } catch (error) {
    console.error('Error creating dashboard link:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to create dashboard link' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

