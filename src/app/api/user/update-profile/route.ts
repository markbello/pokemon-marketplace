import { getAuth0Client } from '@/lib/auth0';
import { NextRequest, NextResponse } from 'next/server';
import { getManagementClient } from '@/lib/auth0-management';
import { prisma } from '@/lib/prisma';
import { slugSchema } from '@/lib/validations-server';

/**
 * Update user profile in Auth0 user_metadata and database
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
    const { firstName, lastName, slug, displayName, phone, preferences, profileComplete } = body;

    // Validate required fields
    if (!firstName || !lastName || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, slug' },
        { status: 400 },
      );
    }

    // Validate slug format
    const slugResult = slugSchema.safeParse(slug);
    if (!slugResult.success) {
      return NextResponse.json(
        { error: slugResult.error.issues[0]?.message || 'Invalid slug format' },
        { status: 400 },
      );
    }

    const userId = session.user.sub;

    // Check slug uniqueness (case-insensitive, excluding current user)
    const existingSlug = await prisma.user.findFirst({
      where: {
        slug: { equals: slug.trim(), mode: 'insensitive' },
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'This username is already taken' },
        { status: 409 },
      );
    }

    // Get Management API client
    const management = getManagementClient();

    // Get existing user to preserve other metadata fields
    const existingUserResponse = await management.users.get({ id: userId });
    const existingUser =
      existingUserResponse.data?.data || existingUserResponse.data || existingUserResponse;
    const existingMetadata = existingUser.user_metadata || {};

    // Merge new metadata with existing metadata (don't overwrite other fields)
    // Note: slug is stored in database only, displayName in both Auth0 and database
    const userMetadata = {
      ...existingMetadata,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: displayName?.trim() || null,
      ...(phone && { phone: phone.trim() }),
      ...(preferences && { preferences }),
      profileComplete: profileComplete ?? true,
    };

    // Update Auth0 user metadata
    await management.users.update(
      { id: userId },
      {
        user_metadata: userMetadata,
      },
    );

    // Update database with slug and displayName
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        slug: slug.trim(),
        displayName: displayName?.trim() || null,
      },
      create: {
        id: userId,
        slug: slug.trim(),
        displayName: displayName?.trim() || null,
      },
    });

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
