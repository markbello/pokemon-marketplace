import { getAuth0Client } from '@/lib/auth0';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugSchema } from '@/lib/validations-server';

/**
 * Check if a slug (username) is available
 * GET /api/user/check-slug?slug=example
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  try {
    if (!slug) {
      return NextResponse.json({ error: 'Slug parameter is required' }, { status: 400 });
    }

    // Validate slug format using shared schema
    const parseResult = slugSchema.safeParse(slug);
    if (!parseResult.success) {
      return NextResponse.json(
        { available: false, error: parseResult.error.issues[0]?.message || 'Invalid slug format' },
        { status: 400 },
      );
    }

    // Get current user session to exclude their own slug
    const auth0 = await getAuth0Client();
    let currentUserId: string | undefined;
    try {
      const session = await auth0.getSession();
      currentUserId = session?.user?.sub;
    } catch {
      // If session check fails, continue without excluding any user
    }

    // Check if slug exists in database (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        slug: {
          equals: slug,
          mode: 'insensitive',
        },
        // Exclude current user's slug
        ...(currentUserId && { NOT: { id: currentUserId } }),
      },
      select: { id: true },
    });

    return NextResponse.json({
      available: !existingUser,
      slug,
    });
  } catch (error) {
    console.error('Error checking slug:', error);

    // If there's an error, return unavailable to be safe
    return NextResponse.json(
      { available: false, slug, error: 'Unable to verify slug availability' },
      { status: 500 },
    );
  }
}
