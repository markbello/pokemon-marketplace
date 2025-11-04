import { auth0 } from '@/lib/auth0';
import { ManagementClient } from 'auth0';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Get Auth0 Management API client
 */
function getManagementClient(): ManagementClient {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    throw new Error('Missing Auth0 Management API credentials');
  }

  return new ManagementClient({
    domain,
    clientId,
    clientSecret,
  });
}

/**
 * Update user avatar in Auth0 user_metadata
 * POST /api/avatar/update
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth0.getSession();
    
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { public_id, secure_url, moderation_status } = body;

    // Validate required fields
    if (!public_id || !secure_url) {
      return NextResponse.json(
        { error: 'Missing required fields: public_id, secure_url' },
        { status: 400 },
      );
    }

    // Check moderation status
    if (moderation_status === 'rejected') {
      return NextResponse.json(
        { 
          error: 'Image was rejected by content moderation',
          moderation_rejected: true,
        },
        { status: 400 },
      );
    }

    // Get Management API client
    const management = getManagementClient();
    const userId = session.user.sub;

    // Get existing user to preserve other metadata fields
    const existingUserResponse = await management.users.get({ id: userId });
    const existingUser = existingUserResponse.data?.data || existingUserResponse.data || existingUserResponse;
    const existingMetadata = existingUser.user_metadata || {};

    // Store avatar public_id and URL in user_metadata
    const userMetadata = {
      ...existingMetadata,
      avatar: {
        public_id,
        secure_url,
        updated_at: new Date().toISOString(),
      },
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
      message: 'Avatar updated successfully',
      avatar: {
        public_id,
        secure_url,
      },
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not authorized to access resource server') || 
          error.message.includes('client-grant')) {
        return NextResponse.json(
          { 
            error: 'Server configuration error: Auth0 Management API access not configured.',
            details: 'The application needs a client grant to access the Auth0 Management API.',
          },
          { status: 500 },
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to update avatar' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

