'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarUrl, getDefaultAvatarUrl, type AvatarSize } from '@/lib/avatar-utils';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  publicId?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

/**
 * UserAvatar component that displays user avatars with Cloudinary support
 * Falls back to default avatar if no publicId or avatarUrl is provided
 */
export function UserAvatar({
  publicId,
  avatarUrl,
  name,
  size = 'medium',
  className,
}: UserAvatarProps) {
  // Get cloud name from environment (client-side accessible via NEXT_PUBLIC_ prefix)
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || null;
  
  // Get avatar URL from Cloudinary if publicId is available
  const cloudinaryUrl = publicId ? getAvatarUrl(publicId, cloudName, size) : null;
  
  // Use provided avatarUrl, Cloudinary URL, or fallback to default
  const imageUrl = avatarUrl || cloudinaryUrl || getDefaultAvatarUrl(size);
  
  // Generate initials for fallback
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    small: 'h-12 w-12 text-sm',
    medium: 'h-20 w-20 text-base',
    large: 'h-28 w-28 text-lg',
  };

  return (
    <Avatar className={cn(sizeClasses[size], 'border-border border', className)}>
      <AvatarImage src={imageUrl} alt={name || 'User avatar'} />
      <AvatarFallback className="bg-muted text-muted-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

