import { getAuth0Client } from '@/lib/auth0';
import { listingPhotoService } from '@/lib/listing-photo-service';
import { NextResponse } from 'next/server';

/**
 * Generate signed upload signature for Cloudinary listing photos
 * GET /api/listings/upload-signature
 */
export async function GET() {
  try {
    // Verify authentication
    const auth0 = await getAuth0Client();
    const session = await auth0.getSession();

    if (!session?.user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate signed upload parameters
    const signatureParams = await listingPhotoService.generateUploadSignature();

    // API key is safe to expose (public) - secret is what's used for signing
    return NextResponse.json({
      ...signatureParams,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error('Error generating listing photo upload signature:', error);

    return NextResponse.json({ error: 'Failed to generate upload signature' }, { status: 500 });
  }
}
