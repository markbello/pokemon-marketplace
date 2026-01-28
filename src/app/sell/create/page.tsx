'use client';

import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { Loader2 } from 'lucide-react';
import { ListingForm } from '@/components/listings/ListingForm';
import { AuthError } from '@/components/auth/AuthError';

export default function CreateListingPage() {
  const pathname = usePathname();
  const { user, isLoading: userLoading } = useUser();

  // Loading state
  if (userLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <AuthError loginReturnTo={pathname} />;
  }

  return (
    <ListingForm 
      mode="create" 
      backHref="/account/seller"
    />
  );
}
