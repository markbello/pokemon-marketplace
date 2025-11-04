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

export type AvatarSize = 'small' | 'medium' | 'large';

export interface UploadResult {
  public_id: string;
  secure_url: string;
  moderation?: {
    status: string;
    kind: string;
  };
}

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  folder: string;
  upload_preset?: string;
}

/**
 * Avatar Service for Cloudinary operations
 */
export class AvatarService {
  private readonly FOLDER = 'avatars';
  private readonly UPLOAD_PRESET = 'user_avatars';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MIN_DIMENSIONS = { width: 150, height: 150 };
  private readonly MAX_DIMENSIONS = { width: 300, height: 300 };

  /**
   * Generate signed upload parameters for secure client-side upload
   */
  async generateUploadSignature(): Promise<SignedUploadParams & { transformation: string }> {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Transformation parameters for the upload
    const transformation = 'c_fill,g_face,w_300,h_300,q_auto,f_auto';
    
    // Generate signature for upload
    // NOTE: All parameters (except file and api_key) must be included in the signature
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: this.FOLDER,
        upload_preset: this.UPLOAD_PRESET,
        moderation: 'aws_rek', // Enable AWS Rekognition moderation
        transformation, // Must be included in signature if used in upload
      },
      process.env.CLOUDINARY_API_SECRET!,
    );

    return {
      signature,
      timestamp,
      folder: this.FOLDER,
      upload_preset: this.UPLOAD_PRESET,
      transformation,
    };
  }

  /**
   * Get avatar URL with transformations (server-side only)
   * For client-side, use getAvatarUrl from avatar-utils.ts
   */
  getAvatarUrl(publicId: string | null | undefined, size: AvatarSize = 'medium'): string | null {
    if (!publicId) {
      return null;
    }

    const sizeConfig = {
      small: { width: 40, height: 40 },
      medium: { width: 80, height: 80 },
      large: { width: 150, height: 150 },
    };

    const config = sizeConfig[size];

    return cloudinary.url(publicId, {
      width: config.width,
      height: config.height,
      crop: 'fill',
      gravity: 'face', // Focus on face
      quality: 'auto',
      format: 'auto',
      secure: true,
    });
  }

  /**
   * Get default avatar URL (server-side only)
   * For client-side, use getDefaultAvatarUrl from avatar-utils.ts
   */
  getDefaultAvatarUrl(size: AvatarSize = 'medium'): string {
    const sizeConfig = {
      small: { width: 40, height: 40 },
      medium: { width: 80, height: 80 },
      large: { width: 150, height: 150 },
    };

    const config = sizeConfig[size];
    
    return `https://ui-avatars.com/api/?name=User&size=${config.width}&background=random&color=fff`;
  }

  /**
   * Delete avatar from Cloudinary
   */
  async deleteAvatar(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error deleting avatar:', error);
      return false;
    }
  }

  /**
   * Validate file before upload (server-side validation)
   * For client-side validation, use validateAvatarFile from avatar-utils.ts
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

  /**
   * Get Cloudinary resource details
   */
  async getResourceInfo(publicId: string) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      console.error('Error fetching resource info:', error);
      return null;
    }
  }
}

export const avatarService = new AvatarService();

