/**
 * PM-65: Admin API route to view invitation codes
 * GET /api/admin/invitation-codes
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth0Client } from '@/lib/auth0';
import { isAdmin } from '@/lib/admin-access';

export async function GET() {
  try {
    // Get authenticated user (same as /api/admin/check)
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json(
        {
          error: 'Authentication required',
        },
        { status: 401 },
      );
    }

    // Check admin access
    const isUserAdmin = await isAdmin(session.user.sub);
    if (!isUserAdmin) {
      return NextResponse.json(
        {
          error: 'Admin access required',
        },
        { status: 403 },
      );
    }

    // Fetch all invitation codes
    const codes = await prisma.invitationCode.findMany({
      orderBy: [{ usedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      select: {
        id: true,
        code: true,
        createdBy: true,
        usedBy: true,
        usedAt: true,
        createdAt: true,
      },
    });

    // Get summary stats
    const total = codes.length;
    const used = codes.filter((c) => c.usedBy).length;
    const unused = total - used;

    return NextResponse.json({
      codes,
      summary: {
        total,
        used,
        unused,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation codes:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch invitation codes',
      },
      { status: 500 },
    );
  }
}
