'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AvatarUpload } from './AvatarUpload';

interface AvatarUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl?: string | null;
  onUploadComplete: (publicId: string, secureUrl: string) => void;
  onUploadError?: (error: string) => void;
}

export function AvatarUploadModal({
  open,
  onOpenChange,
  currentAvatarUrl,
  onUploadComplete,
  onUploadError,
}: AvatarUploadModalProps) {
  const handleUploadComplete = (publicId: string, secureUrl: string) => {
    onUploadComplete(publicId, secureUrl);
    // Close modal after successful upload
    setTimeout(() => {
      onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Photo</DialogTitle>
          <DialogDescription>
            Upload a new profile photo. Your image will be automatically resized and optimized.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AvatarUpload
            currentAvatarUrl={currentAvatarUrl}
            onUploadComplete={handleUploadComplete}
            onUploadError={onUploadError}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

