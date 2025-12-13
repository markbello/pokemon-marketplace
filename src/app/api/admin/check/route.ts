import { NextResponse } from 'next/server';
import { getAuth0Client } from '@/lib/auth0';
import { isCurrentUserAdmin } from '@/lib/admin-access';

/**
 * Check if current user has admin access
 * GET /api/admin/check
 */
export async function GET() {
  try {
    // Check authentication
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    // Check admin role
    const userIsAdmin = await isCurrentUserAdmin();

    return NextResponse.json({ isAdmin: userIsAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    // Return false on error to be safe
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}
