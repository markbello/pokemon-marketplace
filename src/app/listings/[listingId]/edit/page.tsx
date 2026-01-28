'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { Loader2 } from 'lucide-react';
import {
  ListingForm,
  type ExistingListingData,
  type UploadedPhoto,
} from '@/components/listings/ListingForm';
import { AuthError, ForbiddenError, NotFoundError } from '@/components/auth/AuthError';

interface ListingResponse {
  listing: {
    id: string;
    displayTitle: string;
    sellerNotes: string | null;
    askingPriceCents: number;
    status: 'DRAFT' | 'PUBLISHED' | 'SOLD';
    imageUrl: string | null;
    psaCertNumber: string | null;
    slabCondition: string | null;
    card: {
      id: string;
      cardName: string | null;
      setName: string | null;
      cardNumber: string | null;
      variety: string | null;
      frontImageUrl: string | null;
    } | null;
    gradingCertificate: {
      id: string;
      gradingCompany: string;
      certNumber: string;
      grade: number | null;
      gradeLabel: string | null;
      frontImageUrl: string | null;
    } | null;
    photos: Array<{
      id: string;
      publicId: string;
      url: string;
      sortOrder: number;
    }>;
  };
}

export default function EditListingPage() {
  const params = useParams();
  const pathname = usePathname();
  const listingId = params.listingId as string;
  const { user, isLoading: userLoading } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'forbidden' | 'notfound' | null>(null);
  const [existingListing, setExistingListing] = useState<ExistingListingData | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchListing = async () => {
      try {
        const response = await fetch(`/api/seller/listings/${listingId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 403) {
            setErrorType('forbidden');
            setError(errorData.error || 'You do not have permission to edit this listing.');
          } else if (response.status === 404) {
            setErrorType('notfound');
            setError(errorData.error || 'Listing not found.');
          } else {
            setError(errorData.error || 'Failed to load listing');
          }
          setIsLoading(false);
          return;
        }

        const data: ListingResponse = await response.json();
        const listing = data.listing;

        const photos: UploadedPhoto[] = listing.photos.map((p) => ({
          id: p.id,
          publicId: p.publicId,
          url: p.url,
          uploading: false,
        }));

        const cardImageUrl =
          listing.gradingCertificate?.frontImageUrl ||
          listing.card?.frontImageUrl ||
          listing.imageUrl ||
          null;

        const cardName = listing.card?.cardName
          ? `${listing.card.cardName}${
              listing.card.variety ? ` - ${listing.card.variety}` : ''
            }`
          : listing.displayTitle;

        setExistingListing({
          id: listing.id,
          certNumber: listing.gradingCertificate?.certNumber || listing.psaCertNumber || '',
          gradingBrand: listing.gradingCertificate?.gradingCompany || 'PSA',
          gradingScore: listing.gradingCertificate?.grade?.toString() || '',
          slabCondition: listing.slabCondition || '',
          price: (listing.askingPriceCents / 100).toFixed(2),
          notes: listing.sellerNotes || '',
          photos,
          cardImageUrl,
          cardName,
          // TODO: hook up real FMV estimate when API is available
          fmvEstimateCents: 14878,
        });
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError(err instanceof Error ? err.message : 'Failed to load listing');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [listingId, user, userLoading]);

  if (userLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <AuthError loginReturnTo={pathname} />;
  }

  if (errorType === 'forbidden') {
    return (
      <ForbiddenError
        description={error || "You don't have permission to edit this listing."}
        backHref="/my-marketplace"
      />
    );
  }

  if (errorType === 'notfound' || (!existingListing && !isLoading)) {
    return (
      <NotFoundError
        description={error || "This listing doesn't exist or has been removed."}
        backHref="/my-marketplace"
      />
    );
  }

  if (error && !errorType) {
    return (
      <NotFoundError
        title="Error Loading Listing"
        description={error}
        backHref="/my-marketplace"
      />
    );
  }

  return (
    <ListingForm
      mode="edit"
      existingListing={existingListing}
      backHref="/my-marketplace"
    />
  );
}

