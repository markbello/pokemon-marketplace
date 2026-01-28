'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SlabImage } from '@/components/cards/SlabImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Loader2,
  X,
  Lightbulb,
  Check,
  Plus,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Types
export interface LookupCard {
  id: string;
  cardName: string | null;
  setName: string | null;
  cardNumber: string | null;
  variety: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  highestImageGrade: number | null;
}

export interface LookupCertificate {
  id: string;
  certNumber: string;
  gradingCompany: string;
  grade: number | null;
  gradeLabel: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
}

interface LookupPSAData {
  Subject?: string;
  Brand?: string;
  CardNumber?: string;
  Variety?: string;
  GradeDescription?: string;
  CardGrade?: string | number;
  CertNumber?: string | number;
  PSACert?: LookupPSAData;
}

// Photo upload state
export interface UploadedPhoto {
  id: string; // Unique identifier for React key
  file?: File; // Original file (for preview before upload)
  publicId?: string; // Cloudinary public_id (after upload)
  url: string; // Preview URL (blob) or Cloudinary URL
  uploading: boolean;
  error?: string;
}

// Cloudinary upload signature response
interface UploadSignature {
  signature: string;
  timestamp: number;
  folder: string;
  cloud_name: string;
  api_key: string;
}

// Existing listing data for edit mode
export interface ExistingListingData {
  id: string;
  certNumber: string;
  gradingBrand: string;
  gradingScore: string;
  slabCondition: string;
  price: string; // In dollars (display format)
  notes: string;
  photos: UploadedPhoto[];
  cardImageUrl: string | null;
  cardName: string;
  fmvEstimateCents: number | null;
}

// Grading brands and scores
const GRADING_BRANDS = ['PSA', 'CGC', 'BGS', 'TAG'] as const;
const GRADING_SCORES = [
  '10', '9.5', '9', '8.5', '8', '7.5', '7', '6.5', '6', '5.5', '5',
  '4.5', '4', '3.5', '3', '2.5', '2', '1.5', '1',
] as const;

// Slab conditions matching the schema
const SLAB_CONDITIONS = [
  { value: 'MINT', label: 'Mint', description: 'No visible damage to slab' },
  { value: 'NEAR_MINT', label: 'Good', description: 'Minor scratches or scuffs on slab' },
  { value: 'GOOD', label: 'Fair', description: 'Noticeable scratches or damage to slab (card unaffected)' },
  { value: 'DAMAGED', label: 'Poor', description: 'Severe scratches or damage to slab (card unaffected)' },
] as const;

// Progress step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              index <= currentStep ? 'bg-primary' : 'bg-muted'
            )}
          />
          {index < totalSteps - 1 && (
            <div
              className={cn(
                'h-0.5 w-8 transition-colors',
                index < currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Success Modal component
function SuccessModal({
  isOpen,
  onClose,
  onRedirect,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRedirect: () => void;
  message: string;
}) {
  const [countdownKey, setCountdownKey] = useState(0);
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    if (isOpen) {
      setCountdownKey((k) => k + 1);
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (!isOpen) return;
    
    setCountdown(5);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(onRedirect, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownKey]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-500">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold">Success!</h2>
          <p className="text-muted-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">
            The page will automatically redirect in {countdown} seconds.
          </p>
          <Button onClick={onRedirect} className="mt-2">
            Go to My Listings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ListingFormProps {
  mode: 'create' | 'edit';
  existingListing?: ExistingListingData;
  backHref?: string;
}

export function ListingForm({ mode, existingListing, backHref = '/account/seller' }: ListingFormProps) {
  const router = useRouter();

  // Form state
  const [certNumber, setCertNumber] = useState(existingListing?.certNumber || '');
  const [isLookingUpCert, setIsLookingUpCert] = useState(false);
  const [certConfirmed, setCertConfirmed] = useState(mode === 'edit');
  const [lookupError, setLookupError] = useState<string | null>(null);
  
  // Card data from lookup
  const [lookupCard, setLookupCard] = useState<LookupCard | null>(null);
  const [lookupCertificate, setLookupCertificate] = useState<LookupCertificate | null>(null);
  const [lookupPSAData, setLookupPSAData] = useState<LookupPSAData | null>(null);

  // Form fields
  const [gradingBrand, setGradingBrand] = useState<string>(existingListing?.gradingBrand || '');
  const [gradingScore, setGradingScore] = useState<string>(existingListing?.gradingScore || '');
  const [slabCondition, setSlabCondition] = useState<string>(existingListing?.slabCondition || '');
  const [price, setPrice] = useState<string>(existingListing?.price || '');
  const [additionalPhotos, setAdditionalPhotos] = useState<UploadedPhoto[]>(
    existingListing?.photos || []
  );
  const [notes, setNotes] = useState(existingListing?.notes || '');
  
  // Helper text dismissal (only shown in create mode)
  const [showHelperText, setShowHelperText] = useState(mode === 'create');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Remove confirmation dialog
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Fair Market Value
  const [fmvEstimate, setFmvEstimate] = useState<number | null>(
    existingListing?.fmvEstimateCents || null
  );

  // Calculate step for progress indicator
  const currentStep = certConfirmed ? 1 : 0;

  // Get card image URL
  const getCardImageUrl = useCallback(() => {
    if (existingListing?.cardImageUrl) return existingListing.cardImageUrl;
    if (lookupCertificate?.frontImageUrl) return lookupCertificate.frontImageUrl;
    if (lookupCard?.frontImageUrl) return lookupCard.frontImageUrl;
    return null;
  }, [existingListing, lookupCertificate, lookupCard]);

  // Handle cert lookup (only in create mode)
  const handleLookupCertificate = async () => {
    const trimmedCert = certNumber.trim();
    if (!trimmedCert) {
      toast.error('Please enter a certificate number');
      return;
    }

    setIsLookingUpCert(true);
    setLookupError(null);
    setLookupCard(null);
    setLookupCertificate(null);
    setLookupPSAData(null);

    try {
      const response = await fetch(
        `/api/certificates/psa/lookup?certNumber=${encodeURIComponent(trimmedCert)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 'Certificate not found. Please verify the number and try again.'
        );
      }

      const data = await response.json();

      if (data.card && data.certificate) {
        setLookupCard(data.card);
        setLookupCertificate(data.certificate);
        
        if (data.certificate.gradingCompany) {
          setGradingBrand(data.certificate.gradingCompany);
        }
        if (data.certificate.grade !== null) {
          setGradingScore(String(data.certificate.grade));
        }
        
        setCertConfirmed(true);
        setFmvEstimate(14878); // Mock FMV
      } else if (data.psaData) {
        setLookupPSAData(data.psaData);
        const psaCert = data.psaData.PSACert ?? data.psaData;
        
        setGradingBrand('PSA');
        if (psaCert.CardGrade) {
          setGradingScore(String(psaCert.CardGrade));
        }
        
        setCertConfirmed(true);
        setFmvEstimate(14878);
      } else {
        throw new Error('Certificate not found. Please verify the number and try again.');
      }
    } catch (error) {
      console.error('Certificate lookup error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to lookup certificate';
      setLookupError(message);
      toast.error(message);
    } finally {
      setIsLookingUpCert(false);
    }
  };

  // Get upload signature from server
  const getUploadSignature = async (): Promise<UploadSignature | null> => {
    try {
      const response = await fetch('/api/listings/upload-signature');
      if (!response.ok) throw new Error('Failed to get upload signature');
      return response.json();
    } catch (error) {
      console.error('Error getting upload signature:', error);
      return null;
    }
  };

  // Upload single photo to Cloudinary
  const uploadPhotoToCloudinary = async (
    file: File,
    photoId: string,
    signature: UploadSignature
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.api_key);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${signature.cloud_name}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) throw new Error('Upload failed');
    
    const result = await response.json();
    return {
      publicId: result.public_id as string,
      url: result.secure_url as string,
    };
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    e.target.value = '';

    const signature = await getUploadSignature();
    if (!signature) {
      toast.error('Failed to initialize upload. Please try again.');
      return;
    }

    const newPhotos: UploadedPhoto[] = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      url: URL.createObjectURL(file),
      uploading: true,
    }));

    setAdditionalPhotos((prev) => [...prev, ...newPhotos]);

    for (const photo of newPhotos) {
      try {
        const result = await uploadPhotoToCloudinary(photo.file!, photo.id, signature);
        
        setAdditionalPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? { ...p, uploading: false, publicId: result.publicId, url: result.url }
              : p
          )
        );
      } catch (error) {
        console.error('Photo upload error:', error);
        setAdditionalPhotos((prev) =>
          prev.map((p) =>
            p.id === photo.id
              ? { ...p, uploading: false, error: 'Upload failed' }
              : p
          )
        );
        toast.error(`Failed to upload photo`);
      }
    }
  };

  // Remove photo
  const removePhoto = (photoId: string) => {
    setAdditionalPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId);
      if (photo?.file) {
        URL.revokeObjectURL(photo.url);
      }
      return prev.filter((p) => p.id !== photoId);
    });
  };

  // Check if all photos are uploaded
  const allPhotosUploaded = additionalPhotos.every((p) => p.publicId && !p.uploading);
  const hasUploadErrors = additionalPhotos.some((p) => p.error);

  // Calculate quick-select prices (rounded to whole dollars)
  const getQuickSelectPrices = () => {
    if (!fmvEstimate) return [];
    return [
      { label: '120%FMV', value: Math.round((fmvEstimate * 1.2) / 100) },
      { label: '110%FMV', value: Math.round((fmvEstimate * 1.1) / 100) },
      { label: '100%FMV', value: Math.round(fmvEstimate / 100) },
      { label: '90%FMV', value: Math.round((fmvEstimate * 0.9) / 100) },
      { label: '80%FMV', value: Math.round((fmvEstimate * 0.8) / 100) },
    ];
  };

  // Validation
  const validateForm = (): string | null => {
    if (!certConfirmed && mode === 'create') return 'Please confirm the certificate number first';
    if (mode === 'create' && !gradingBrand) return 'Please select a grading brand';
    if (mode === 'create' && !gradingScore) return 'Please select a grading score';
    if (mode === 'create' && !slabCondition) return 'Please select a slab condition';
    if (!price || parseFloat(price) <= 0) return 'Please enter a valid price';
    if (additionalPhotos.length === 0) return 'Please upload at least one photo';
    if (!allPhotosUploaded) return 'Please wait for all photos to finish uploading';
    if (hasUploadErrors) return 'Some photos failed to upload. Please remove and try again.';
    return null;
  };

  // Handle publish
  const handlePublish = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const askingPriceCents = Math.round(parseFloat(price) * 100);
      
      const photos = additionalPhotos
        .filter((p) => p.publicId && p.url)
        .map((p) => ({ publicId: p.publicId!, url: p.url }));

      if (mode === 'create') {
        const response = await fetch('/api/seller/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            askingPriceCents,
            sellerNotes: notes || undefined,
            psaCertNumber: lookupCertificate?.certNumber || certNumber.trim(),
            cardId: lookupCard?.id,
            gradingCertificateId: lookupCertificate?.id,
            slabCondition,
            photos,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to publish listing');
        }

        setSuccessMessage('This card has been uploaded to your My Marketplace page.');
      } else {
        // Edit mode - update existing listing
        const response = await fetch(`/api/seller/listings/${existingListing!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            askingPriceCents,
            sellerNotes: notes || null,
            status: 'PUBLISHED',
            photos,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update listing');
        }

        setSuccessMessage('Your listing has been updated and published.');
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Publish error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish listing');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save as draft
  const handleSaveAsDraft = async () => {
    if (mode === 'create' && !certConfirmed) {
      toast.error('Please confirm the certificate number first');
      return;
    }
    
    const uploadingPhotos = additionalPhotos.some((p) => p.uploading);
    if (uploadingPhotos) {
      toast.error('Please wait for photos to finish uploading');
      return;
    }

    setIsSaving(true);

    try {
      const askingPriceCents = price ? Math.round(parseFloat(price) * 100) : 0;
      
      const photos = additionalPhotos
        .filter((p) => p.publicId && p.url)
        .map((p) => ({ publicId: p.publicId!, url: p.url }));

      if (mode === 'create') {
        const response = await fetch('/api/seller/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            askingPriceCents,
            sellerNotes: notes || undefined,
            psaCertNumber: lookupCertificate?.certNumber || certNumber.trim(),
            cardId: lookupCard?.id,
            gradingCertificateId: lookupCertificate?.id,
            slabCondition: slabCondition || 'UNKNOWN',
            status: 'DRAFT',
            photos,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to save draft');
        }
      } else {
        // Edit mode
        const response = await fetch(`/api/seller/listings/${existingListing!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            askingPriceCents,
            sellerNotes: notes || null,
            status: 'DRAFT',
            photos,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to save draft');
        }
      }

      toast.success('Draft saved');
      router.push(backHref);
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle remove (edit mode only)
  const handleRemove = async () => {
    if (mode !== 'edit' || !existingListing) return;

    setIsRemoving(true);
    try {
      const response = await fetch(`/api/seller/listings/${existingListing.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove listing');
      }

      toast.success('Listing removed');
      router.push(backHref);
    } catch (error) {
      console.error('Remove error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove listing');
    } finally {
      setIsRemoving(false);
      setShowRemoveDialog(false);
    }
  };

  // Handle delete (create mode - just navigate away)
  const handleDelete = () => {
    if (mode === 'create') {
      router.push(backHref);
    } else {
      setShowRemoveDialog(true);
    }
  };

  // Handle success modal redirect
  const handleSuccessRedirect = useCallback(() => {
    setShowSuccessModal(false);
    router.push(backHref);
  }, [router, backHref]);

  // Get display info
  const psaCert = lookupPSAData?.PSACert ?? lookupPSAData;
  const cardName = existingListing?.cardName || lookupCard?.cardName || psaCert?.Subject || 'Card';
  const cardImageUrl = getCardImageUrl();

  // Is the form in a ready state for editing (in edit mode, always; in create mode, after cert confirmed)
  const isFormReady = mode === 'edit' || certConfirmed;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Back Link */}
      <div className="container mx-auto px-4 pt-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-20">
          {/* Left Column - Card Preview */}
          <div className="">
            <SlabImage src={cardImageUrl} alt={cardName} />
          </div>

          {/* Right Column - Form */}
          <div className="space-y-6">
            {/* Progress Indicator (only in create mode) */}
            {mode === 'create' && (
              <StepIndicator currentStep={currentStep} totalSteps={4} />
            )}

            {/* Page Title */}
            <h1 className="text-2xl font-bold">
              {mode === 'create' ? 'Listing the card' : 'Editing the card'}
            </h1>

            {/* Helper Text (only in create mode) */}
            {mode === 'create' && showHelperText && (
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                <Lightbulb className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="flex-1 text-sm text-muted-foreground">
                  Enter the grading card cert # to automatically load the card photo and information in KADO.
                </p>
                <button
                  onClick={() => setShowHelperText(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Certificate Number Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label className="text-base font-semibold">
                  Cert #<span className="text-red-500">*</span>
                </Label>
                {mode === 'create' && (
                  <p className="text-sm text-muted-foreground">
                    Found on the front of your graded slab, usually near the barcode
                  </p>
                )}
              </div>
              <Input
                placeholder="e.g. 88249501"
                value={certNumber}
                onChange={(e) => {
                  if (mode === 'edit') return; // Read-only in edit mode
                  setCertNumber(e.target.value);
                  if (certConfirmed) {
                    setCertConfirmed(false);
                    setLookupCard(null);
                    setLookupCertificate(null);
                    setLookupPSAData(null);
                    setLookupError(null);
                    setFmvEstimate(null);
                  }
                }}
                disabled={mode === 'edit' || isLookingUpCert}
                readOnly={mode === 'edit'}
                className={mode === 'edit' ? 'bg-muted' : ''}
              />
              {lookupError && (
                <p className="text-sm text-destructive">{lookupError}</p>
              )}
              {mode === 'create' && (
                <Button
                  onClick={handleLookupCertificate}
                  disabled={isLookingUpCert || !certNumber.trim()}
                  className={cn(
                    certConfirmed && 'bg-gray-600 hover:bg-gray-600'
                  )}
                >
                  {isLookingUpCert ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : certConfirmed ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirmed
                    </>
                  ) : (
                    'Confirm'
                  )}
                </Button>
              )}
            </div>

            {/* Grading Info Section */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border p-4">
                <Label className="text-base font-semibold">
                  Grading Brand<span className="text-red-500">*</span>
                </Label>
                {mode === 'edit' ? (
                  <Input
                    value={gradingBrand}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <Select
                    value={gradingBrand}
                    onValueChange={setGradingBrand}
                    disabled={!certConfirmed || isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADING_BRANDS.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2 rounded-lg border p-4">
                <Label className="text-base font-semibold">
                  Grading Score<span className="text-red-500">*</span>
                </Label>
                {mode === 'edit' ? (
                  <Input
                    value={gradingScore}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <Select
                    value={gradingScore}
                    onValueChange={setGradingScore}
                    disabled={!certConfirmed || isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select score" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADING_SCORES.map((score) => (
                        <SelectItem key={score} value={score}>
                          {score}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Slab Condition Section (only editable in create mode) */}
            {mode === 'create' && (
              <div className="space-y-2 rounded-lg border p-4">
                <Label className="text-base font-semibold">
                  Slab Condition<span className="text-red-500">*</span>
                </Label>
                <Select
                  value={slabCondition}
                  onValueChange={setSlabCondition}
                  disabled={!certConfirmed || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select slab condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {SLAB_CONDITIONS.map((condition) => (
                      <SelectItem key={condition.value} value={condition.value}>
                        {condition.label} - {condition.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Price Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <Label className="text-base font-semibold">
                Price<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={!isFormReady || isSaving}
                  className="pl-7"
                />
              </div>

              {/* FMV Estimate */}
              {fmvEstimate && (
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-500 font-medium">
                    Kado Fair Market Value Estimate: ${(fmvEstimate / 100).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Quick-select price buttons */}
              {fmvEstimate && (
                <div className="flex flex-wrap gap-2">
                  {getQuickSelectPrices().map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setPrice(String(item.value))}
                      disabled={isSaving}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                      <div className="font-medium">${item.value}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Photos Section */}
            <div className="space-y-4 rounded-lg border p-4">
              <Label className="text-base font-semibold">
                Additional Photos<span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-3">
                {/* Uploaded photos */}
                {additionalPhotos.map((photo) => (
                  <div key={photo.id} className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={photo.url}
                      alt="Listing photo"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {photo.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                    {photo.error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/50">
                        <X className="h-6 w-6 text-white" />
                      </div>
                    )}
                    {!photo.uploading && (
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                
                {/* Add photo button */}
                <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={!isFormReady || isSaving}
                    className="sr-only"
                  />
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </label>
              </div>
              {additionalPhotos.length === 0 && isFormReady && (
                <p className="text-sm text-muted-foreground">
                  At least one photo is required
                </p>
              )}
              {additionalPhotos.some((p) => p.uploading) && (
                <p className="text-sm text-muted-foreground">
                  Uploading photos...
                </p>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-2 rounded-lg border p-4">
              <Label className="text-base font-semibold">Notes</Label>
              <textarea
                placeholder="Add any additional details buyers should know — flaws, grading info, or anything else."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!isFormReady || isSaving}
                className="border-input focus-visible:ring-ring bg-background placeholder:text-muted-foreground flex min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handlePublish}
                disabled={isSaving || !isFormReady}
                className="flex-1 sm:flex-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Publishing...' : 'Saving...'}
                  </>
                ) : (
                  'Publish'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveAsDraft}
                disabled={isSaving || !isFormReady}
                className="flex-1 sm:flex-none"
              >
                Save as draft
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isSaving}
                className="flex-1 sm:flex-none"
              >
                {mode === 'edit' ? 'Remove' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onRedirect={handleSuccessRedirect}
        message={successMessage}
      />

      {/* Remove Confirmation Dialog (edit mode only) */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this listing from the marketplace. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
