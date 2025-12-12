import { auth0 } from '@/lib/auth0';
import { NextRequest, NextResponse } from 'next/server';
import { getManagementClient } from '@/lib/auth0-management';

/**
 * Check if a username is available
 * GET /api/user/check-username?username=example
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  try {
    if (!username) {
      return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username) || username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { available: false, error: 'Invalid username format' },
        { status: 400 },
      );
    }

    // Get current user session to exclude their own username
    // In onboarding, user should always be authenticated, but handle gracefully
    let currentUserId: string | undefined;
    try {
      const session = await auth0.getSession(request);
      currentUserId = session?.user?.sub;
    } catch {
      // If session check fails, continue without excluding any user
    }

    // Get Management API client
    const management = getManagementClient();

    // Search for users with this displayName in user_metadata
    // Note: Auth0 doesn't have a built-in way to search user_metadata efficiently
    // This is a simplified approach - in production, you might want to:
    // 1. Use a separate database to track usernames
    // 2. Use Auth0's search API with pagination
    // 3. Cache usernames for better performance

    // For now, we'll search for users with this displayName
    // This is not perfect but works for MVP
    const usersResponse = await management.users.getAll({
      q: `user_metadata.displayName:"${username}"`,
      per_page: 1,
    });

    // Extract user data from response (Management API returns nested structure)
    // The response structure is: { data: { data: User[] } } or { data: User[] }
    type UserResponse = { data?: { data?: unknown[] } | unknown[] };
    const users = (usersResponse as UserResponse).data || usersResponse;
    const usersArray = Array.isArray(users) ? users : (users as { data?: unknown[] })?.data || [];

    // Check if username is taken by another user (exclude current user)
    const isTaken = usersArray.some((userItem) => {
      // Handle nested user data structure
      const userData =
        (
          userItem as {
            data?: { user_metadata?: { displayName?: string }; user_id?: string };
            user_metadata?: { displayName?: string };
            user_id?: string;
          }
        ).data || userItem;
      const userMetadata = (userData as { user_metadata?: { displayName?: string } }).user_metadata;
      const userId = (userData as { user_id?: string }).user_id;

      return userMetadata?.displayName === username && userId !== currentUserId;
    });

    return NextResponse.json({
      available: !isTaken,
      username,
    });
  } catch (error) {
    console.error('Error checking username:', error);

    // Check for Auth0 Management API authorization errors
    if (
      error instanceof Error &&
      (error.message.includes('not authorized to access resource server') ||
        error.message.includes('client-grant'))
    ) {
      console.error('Auth0 Management API not configured. Please create a client grant.');
      // Still return available to avoid blocking users, but log the error
    }

    // If there's an error, we'll assume it's available to avoid blocking users
    // In production, you might want to handle this differently
    const username = searchParams.get('username');
    return NextResponse.json(
      { available: true, username, warning: 'Unable to verify username availability' },
      { status: 200 },
    );
  }
}
