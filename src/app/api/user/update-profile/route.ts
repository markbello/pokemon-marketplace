import { getAuth0Client } from '@/lib/auth0';
import { NextRequest, NextResponse } from 'next/server';
import { getManagementClient } from '@/lib/auth0-management';

/**
 * Update user profile in Auth0 user_metadata
 * POST /api/user/update-profile
 */
export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, displayName, phone, preferences, profileComplete } = body;

    // Validate required fields
    if (!firstName || !lastName || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, displayName' },
        { status: 400 },
      );
    }

    // Get Management API client
    const management = getManagementClient();

    // Extract user ID from Auth0 sub (format: "auth0|..." or "google-oauth2|...")
    const userId = session.user.sub;

    // Get existing user to preserve other metadata fields
    // Management API returns user data in response.data.data structure
    const existingUserResponse = await management.users.get({ id: userId });
    const existingUser =
      existingUserResponse.data?.data || existingUserResponse.data || existingUserResponse;
    const existingMetadata = existingUser.user_metadata || {};

    // Merge new metadata with existing metadata (don't overwrite other fields)
    const userMetadata = {
      ...existingMetadata,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: displayName.trim(),
      ...(phone && { phone: phone.trim() }),
      ...(preferences && { preferences }),
      profileComplete: profileComplete ?? true,
    };

    // Update user metadata
    await management.users.update(
      { id: userId },
      {
        user_metadata: userMetadata,
      },
    );

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating profile:', error);

    // Handle Auth0 API errors
    if (error instanceof Error) {
      // Check for specific Auth0 Management API authorization errors
      if (
        error.message.includes('not authorized to access resource server') ||
        error.message.includes('client-grant')
      ) {
        return NextResponse.json(
          {
            error:
              'Server configuration error: Auth0 Management API access not configured. Please contact support.',
            details:
              'The application needs a client grant to access the Auth0 Management API. This is a server-side configuration issue.',
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { error: error.message || 'Failed to update profile' },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
