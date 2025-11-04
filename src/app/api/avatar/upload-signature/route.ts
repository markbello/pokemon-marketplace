import { auth0 } from '@/lib/auth0';
import { avatarService } from '@/lib/avatar-service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate signed upload signature for Cloudinary
 * GET /api/avatar/upload-signature
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth0.getSession();
    
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Simple rate limiting check (in-memory)
    // In production, use Redis or a proper rate limiting service
    // Only enable rate limiting in production to avoid blocking development/testing
    if (process.env.NODE_ENV === 'production') {
      const rateLimitKey = `avatar_upload_${session.user.sub}`;
      const lastUpload = (global as any).avatarUploadRateLimit?.[rateLimitKey];
      const now = Date.now();
      const oneMinute = 60 * 1000;

      if (lastUpload && now - lastUpload < oneMinute) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait before uploading again.' },
          { status: 429 },
        );
      }

      // Update rate limit
      if (!(global as any).avatarUploadRateLimit) {
        (global as any).avatarUploadRateLimit = {};
      }
      (global as any).avatarUploadRateLimit[rateLimitKey] = now;
    }

    // Generate signed upload parameters
    const signatureParams = await avatarService.generateUploadSignature();

    // API key is safe to expose (public) - secret is what's used for signing
    return NextResponse.json({
      ...signatureParams,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error('Error generating upload signature:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate upload signature' },
      { status: 500 },
    );
  }
}

