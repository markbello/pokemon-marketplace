/**
 * PM-65: API route to redeem (mark as used) invitation codes
 * POST /api/invitation-codes/redeem
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth0Client } from '@/lib/auth0';
import { z } from 'zod';

const redeemSchema = z.object({
  code: z.string().min(1, 'Invitation code is required').trim().toUpperCase(),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (same pattern as other admin routes)
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 },
      );
    }

    const userId = session.user.sub;
    const body = await request.json();
    const { code } = redeemSchema.parse(body);

    // Check if user has already redeemed a code
    const existingRedemption = await prisma.invitationCode.findFirst({
      where: { usedBy: userId },
    });

    if (existingRedemption) {
      return NextResponse.json({
        success: true,
        message: 'Invitation code already redeemed',
        code: existingRedemption.code,
      });
    }

    // Find and redeem the code
    const invitationCode = await prisma.invitationCode.findUnique({
      where: { code },
    });

    // Code doesn't exist
    if (!invitationCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid invitation code',
        },
        { status: 400 },
      );
    }

    // Code already used by someone else
    if (invitationCode.usedBy && invitationCode.usedBy !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'This invitation code has already been used',
        },
        { status: 400 },
      );
    }

    // Mark code as used
    await prisma.invitationCode.update({
      where: { code },
      data: {
        usedBy: userId,
        usedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation code redeemed successfully',
      code: invitationCode.code,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message || 'Invalid input',
        },
        { status: 400 },
      );
    }

    console.error('Error redeeming invitation code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to redeem invitation code',
      },
      { status: 500 },
    );
  }
}
