/**
 * Client-side avatar utilities (no Cloudinary SDK dependency)
 */

export type AvatarSize = 'small' | 'medium' | 'large';

/**
 * Get avatar URL with transformations (client-side safe)
 */
export function getAvatarUrl(
  publicId: string | null | undefined,
  cloudName: string | null | undefined,
  size: AvatarSize = 'medium',
): string | null {
  if (!publicId || !cloudName) {
    return null;
  }

  const sizeConfig = {
    small: { width: 40, height: 40 },
    medium: { width: 80, height: 80 },
    large: { width: 150, height: 150 },
  };

  const config = sizeConfig[size];

  // Build Cloudinary URL manually for client-side compatibility
  // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}
  const transformations = [
    `w_${config.width}`,
    `h_${config.height}`,
    'c_fill',
    'g_face',
    'q_auto',
    'f_auto',
  ].join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}

/**
 * Get default avatar URL (client-side safe)
 */
export function getDefaultAvatarUrl(size: AvatarSize = 'medium'): string {
  const sizeConfig = {
    small: { width: 40, height: 40 },
    medium: { width: 80, height: 80 },
    large: { width: 150, height: 150 },
  };

  const config = sizeConfig[size];
  
  // Return a default avatar - you can replace this with an actual default image
  // For now, returning a data URI for a simple placeholder
  return `https://ui-avatars.com/api/?name=User&size=${config.width}&background=random&color=fff`;
}

/**
 * Validate file before upload (client-side)
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File must be a JPG, PNG, or WebP image',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size must be less than 10MB',
    };
  }

  return { valid: true };
}

/**
 * Validate image dimensions (client-side)
 */
export async function validateImageDimensions(file: File): Promise<{ valid: boolean; error?: string }> {
  const MIN_DIMENSIONS = { width: 150, height: 150 };

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.width < MIN_DIMENSIONS.width || img.height < MIN_DIMENSIONS.height) {
        resolve({
          valid: false,
          error: `Image must be at least ${MIN_DIMENSIONS.width}x${MIN_DIMENSIONS.height} pixels`,
        });
        return;
      }

      resolve({ valid: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Invalid image file',
      });
    };

    img.src = url;
  });
}

