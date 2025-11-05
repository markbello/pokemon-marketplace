import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Test database connection and get database info
 * GET /api/test-db
 */
export async function GET() {
  try {
    // Test connection (Prisma client handles connection pooling automatically)
    // Count users
    const userCount = await prisma.user.count();

    // Get database info
    const result = await prisma.$queryRaw<Array<{ db_name: string }>>`
      SELECT current_database() as db_name
    `;

    return NextResponse.json({
      success: true,
      userCount,
      database: result[0]?.db_name,
      environment: process.env.NODE_ENV,
      message: 'Database connected successfully!',
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 },
    );
  }
}

/**
 * Create a test user (simulating Auth0 cache)
 * POST /api/test-db
 */
export async function POST() {
  try {
    // Create a test user (simulating Auth0 cache)
    const testUser = await prisma.user.create({
      data: {
        id: `auth0|test-${Date.now()}`,
        displayName: `TestUser${Date.now()}`,
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    });

    return NextResponse.json({
      success: true,
      user: testUser,
      message: 'Test user created!',
    });
  } catch (error) {
    console.error('Database error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create test user';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

