/**
 * PM-65: API route to validate invitation codes
 * POST /api/invitation-codes/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const validateSchema = z.object({
  code: z.string().min(1, 'Invitation code is required').trim().toUpperCase(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = validateSchema.parse(body);

    // Check if code exists
    const invitationCode = await prisma.invitationCode.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        usedBy: true,
        usedAt: true,
      },
    });

    // Code doesn't exist
    if (!invitationCode) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid invitation code',
        },
        { status: 400 },
      );
    }

    // Code already used
    if (invitationCode.usedBy) {
      return NextResponse.json(
        {
          valid: false,
          error: 'This invitation code has already been used',
        },
        { status: 400 },
      );
    }

    // Code is valid and unused
    return NextResponse.json({
      valid: true,
      code: invitationCode.code,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          valid: false,
          error: error.issues[0]?.message || 'Invalid input',
        },
        { status: 400 },
      );
    }

    console.error('Error validating invitation code:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Failed to validate invitation code',
      },
      { status: 500 },
    );
  }
}
