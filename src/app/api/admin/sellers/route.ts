import { NextResponse } from 'next/server';
import { getAuth0Client } from '@/lib/auth0';
import { getAllSellerAccounts } from '@/lib/stripe-connect';
import { isCurrentUserAdmin } from '@/lib/admin-access';

/**
 * Get all seller accounts with verification status
 * GET /api/admin/sellers
 * Requires admin role
 */
export async function GET() {
  try {
    // Check authentication
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const userIsAdmin = await isCurrentUserAdmin();
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get all seller accounts
    const sellers = await getAllSellerAccounts();

    return NextResponse.json({
      sellers,
      count: sellers.length,
    });
  } catch (error) {
    console.error('Error fetching seller accounts:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch seller accounts' },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
