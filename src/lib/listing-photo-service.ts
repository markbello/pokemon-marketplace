// Server-side only - Cloudinary SDK requires Node.js modules
import { v2 as cloudinary } from 'cloudinary';

/**
 * Initialize Cloudinary configuration (server-side only)
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  folder: string;
}

/**
 * Listing Photo Service for Cloudinary operations
 * Used for additional photos uploaded by sellers for their listings
 */
export class ListingPhotoService {
  private readonly FOLDER = 'listing-photos';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Generate signed upload parameters for secure client-side upload
   */
  async generateUploadSignature(): Promise<SignedUploadParams> {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Generate signature for upload
    // NOTE: All parameters (except file and api_key) must be included in the signature
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: this.FOLDER,
      },
      process.env.CLOUDINARY_API_SECRET!,
    );

    return {
      signature,
      timestamp,
      folder: this.FOLDER,
    };
  }

  /**
   * Get photo URL with transformations (server-side only)
   */
  getPhotoUrl(
    publicId: string | null | undefined,
    options: { width?: number; height?: number } = {},
  ): string | null {
    if (!publicId) {
      return null;
    }

    return cloudinary.url(publicId, {
      width: options.width,
      height: options.height,
      crop: options.width || options.height ? 'limit' : undefined, // Preserve aspect ratio
      quality: 'auto',
      format: 'auto',
      secure: true,
    });
  }

  /**
   * Delete photo from Cloudinary
   */
  async deletePhoto(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting listing photo:', error);
      return false;
    }
  }

  /**
   * Delete multiple photos from Cloudinary
   */
  async deletePhotos(publicIds: string[]): Promise<boolean> {
    if (publicIds.length === 0) return true;

    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return Object.values(result.deleted).every((status) => status === 'deleted');
    } catch (error) {
      console.error('Error deleting listing photos:', error);
      return false;
    }
  }

  /**
   * Validate file before upload (server-side validation)
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File must be a JPG, PNG, or WebP image',
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File size must be less than 10MB',
      };
    }

    return { valid: true };
  }
}

export const listingPhotoService = new ListingPhotoService();
