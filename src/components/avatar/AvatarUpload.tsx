'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateAvatarFile, validateImageDimensions } from '@/lib/avatar-utils';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onUploadComplete: (publicId: string, secureUrl: string) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AvatarUpload({
  currentAvatarUrl,
  onUploadComplete,
  onUploadError,
  disabled = false,
  className,
}: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setValidationError(null);
      setUploadProgress(0);

      // Validate file
      const fileValidation = validateAvatarFile(file);
      if (!fileValidation.valid) {
        setValidationError(fileValidation.error || 'Invalid file');
        return;
      }

      // Validate dimensions
      const dimensionValidation = await validateImageDimensions(file);
      if (!dimensionValidation.valid) {
        setValidationError(dimensionValidation.error || 'Invalid image dimensions');
        return;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Start upload
      setIsUploading(true);
      setUploadProgress(10);

      try {
        // Get signed upload signature
        const signatureResponse = await fetch('/api/avatar/upload-signature');
        if (!signatureResponse.ok) {
          const errorData = await signatureResponse.json().catch(() => ({}));
          if (signatureResponse.status === 429) {
            throw new Error(
              errorData.error || 'Rate limit exceeded. Please wait before uploading again.',
            );
          }
          throw new Error(errorData.error || 'Failed to get upload signature');
        }

        const { signature, timestamp, folder, upload_preset, cloud_name, api_key, transformation } =
          await signatureResponse.json();
        setUploadProgress(30);

        if (!cloud_name || !api_key) {
          throw new Error('Cloudinary configuration missing');
        }

        // Create form data for Cloudinary upload
        // For signed uploads, we need: file, api_key, timestamp, signature, and any other parameters
        // IMPORTANT: All parameters (except file and api_key) must match exactly what was signed
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', api_key);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);
        formData.append('upload_preset', upload_preset);
        formData.append('moderation', 'aws_rek'); // Enable moderation
        if (transformation) {
          formData.append('transformation', transformation);
        }

        // Create abort controller for upload cancellation
        abortControllerRef.current = new AbortController();

        // Upload to Cloudinary
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;

        const uploadResponse = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        setUploadProgress(70);

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Upload failed');
        }

        const uploadResult = await uploadResponse.json();
        setUploadProgress(90);

        // Check moderation status
        if (uploadResult.moderation && uploadResult.moderation[0]) {
          const moderation = uploadResult.moderation[0];
          if (moderation.status === 'rejected') {
            // Clean up preview
            if (preview) URL.revokeObjectURL(preview);
            setPreviewUrl(currentAvatarUrl || null);
            setValidationError(
              'Image was rejected by content moderation. Please upload a different image that complies with our guidelines.',
            );
            setIsUploading(false);
            setUploadProgress(0);
            if (onUploadError) {
              onUploadError('Content moderation rejection');
            }
            return;
          }
        }

        // Update avatar in Auth0
        const updateResponse = await fetch('/api/avatar/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url,
            moderation_status: uploadResult.moderation?.[0]?.status || 'approved',
          }),
        });

        setUploadProgress(100);

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update avatar');
        }

        // Clean up old preview URL if it was a blob URL
        if (preview && preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }

        // Use the secure URL from Cloudinary
        setPreviewUrl(uploadResult.secure_url);

        // Call completion callback
        onUploadComplete(uploadResult.public_id, uploadResult.secure_url);

        // Reset progress after a short delay
        setTimeout(() => {
          setUploadProgress(0);
          setIsUploading(false);
        }, 500);
      } catch (error) {
        // Clean up preview on error
        if (preview) URL.revokeObjectURL(preview);
        setPreviewUrl(currentAvatarUrl || null);

        const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
        setError(errorMessage);
        setIsUploading(false);
        setUploadProgress(0);

        if (onUploadError) {
          onUploadError(errorMessage);
        }
      }
    },
    [currentAvatarUrl, onUploadComplete, onUploadError],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) {
        return;
      }

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, isUploading, handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileSelect],
  );

  const handleRemove = useCallback(() => {
    if (isUploading) {
      // Cancel upload if in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Clean up preview URL if it's a blob URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setError(null);
    setValidationError(null);
  }, [isUploading, previewUrl]);

  const handleButtonClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const displayError = error || validationError;

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isDragging && !disabled ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'cursor-not-allowed opacity-50',
          isUploading && 'pointer-events-none',
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileInputChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative w-full p-6">
            <div className="border-background relative mx-auto aspect-square w-48 overflow-hidden rounded-full border-4 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Avatar preview" className="h-full w-full object-cover" />
              {isUploading && (
                <div className="bg-background/80 absolute inset-0 flex items-center justify-center">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleButtonClick}
                disabled={isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Change Photo
              </Button>
            )}
            {!disabled && !isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={handleRemove}
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col items-center justify-center p-12 text-center">
            <div
              className={cn(
                'mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              )}
            >
              {isUploading ? (
                <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
              ) : (
                <ImageIcon className="text-muted-foreground h-10 w-10" />
              )}
            </div>
            <p className="mb-2 text-sm font-medium">
              {isUploading ? 'Uploading...' : 'Upload your profile photo'}
            </p>
            <p className="text-muted-foreground mb-4 text-xs">
              Drag and drop an image here, or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              JPG, PNG, or WebP • Max 10MB • Min 150x150px
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={handleButtonClick}
              disabled={disabled || isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Image
            </Button>
          </div>
        )}

        {isUploading && uploadProgress > 0 && (
          <div className="absolute right-4 bottom-4 left-4">
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </div>

      {displayError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
