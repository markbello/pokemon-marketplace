import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';
import { getManagementClient } from '@/lib/auth0-management';

/**
 * Get current user profile with full user_metadata
 * GET /api/user/me
 */
export async function GET() {
  try {
    // Get the current user session
    // In Auth0 v4 App Router, getSession() is called without request parameter
    // The session is automatically read from cookies
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Management API client
    const management = getManagementClient();

    // Fetch full user data including user_metadata
    const userId = session.user.sub;

    // Get user with all fields - user_metadata should be included by default
    // Note: Management API users.get() returns the user data wrapped in a response object
    // The actual user data is in response.data.data (nested structure)
    const response = await management.users.get({ id: userId });
    const userData = response.data?.data || response.data || response;
    const userMetadata = userData.user_metadata || {};
    const appMetadata = userData.app_metadata || {};

    return NextResponse.json(
      {
        user: {
          sub: userData.user_id,
          email: userData.email,
          name: userData.name,
          nickname: userData.nickname,
          picture: userData.picture,
          user_metadata: userMetadata,
          app_metadata: appMetadata,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error fetching user profile:', error);

    if (error instanceof Error) {
      // Don't expose internal error details to client
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
