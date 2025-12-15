/**
 * PM-65: API route to check if user has redeemed an invitation code
 * GET /api/invitation-codes/check-status
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth0Client } from '@/lib/auth0';

export async function GET() {
  try {
    // Get authenticated user (same pattern as other admin routes)
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json(
        {
          hasRedeemed: false,
          error: 'Authentication required',
        },
        { status: 401 },
      );
    }

    const userId = session.user.sub;

    // Check if user has redeemed a code
    const redemption = await prisma.invitationCode.findFirst({
      where: { usedBy: userId },
      select: {
        code: true,
        usedAt: true,
      },
    });

    return NextResponse.json({
      hasRedeemed: !!redemption,
      code: redemption?.code,
      redeemedAt: redemption?.usedAt,
    });
  } catch (error) {
    console.error('Error checking invitation code status:', error);
    return NextResponse.json(
      {
        hasRedeemed: false,
        error: 'Failed to check invitation code status',
      },
      { status: 500 },
    );
  }
}
