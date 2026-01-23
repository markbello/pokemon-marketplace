'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser } from '@auth0/nextjs-auth0';
import { basicProfileSchema, type BasicProfileFormData } from '@/lib/validations';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AvatarUpload } from '@/components/avatar/AvatarUpload';
import { getAvatarUrl } from '@/lib/avatar-utils';

interface BasicProfileStepProps {
  initialData?: Partial<BasicProfileFormData>;
  onSubmit: (data: BasicProfileFormData) => Promise<void>;
  onNext: (data: BasicProfileFormData) => void;
}

export function BasicProfileStep({ initialData, onSubmit, onNext }: BasicProfileStepProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);

  // Get current avatar URL from user metadata
  useEffect(() => {
    if (user?.user_metadata?.avatar) {
      const avatar = user.user_metadata.avatar;
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || null;

      if (avatar.public_id) {
        setCurrentAvatarUrl(
          getAvatarUrl(avatar.public_id, cloudName, 'large') || avatar.secure_url || null,
        );
      } else if (avatar.secure_url) {
        setCurrentAvatarUrl(avatar.secure_url);
      }
    }
  }, [user]);

  const form = useForm<BasicProfileFormData>({
    resolver: zodResolver(basicProfileSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      slug: initialData?.slug || '',
      displayName: initialData?.displayName || '',
      phone: initialData?.phone || '',
    },
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  // Update form values when initialData changes (for editing existing profiles)
  useEffect(() => {
    // Only reset if we have actual data (not just an empty object)
    if (initialData && (initialData.firstName || initialData.lastName || initialData.slug)) {
      form.reset({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        slug: initialData.slug || '',
        displayName: initialData.displayName || '',
        phone: initialData.phone || '',
      });
    }
  }, [initialData, form]);

  const slug = form.watch('slug');

  // Debounced slug availability check
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setUsernameError(null);
      form.clearErrors('slug');
      return;
    }

    // Validate format first (must start with letter/number, allow letters, numbers, underscores, dashes)
    const slugRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
    if (!slugRegex.test(slug)) {
      setUsernameError('Username must start with a letter or number and can only contain letters, numbers, underscores, and dashes');
      form.setError('slug', {
        type: 'manual',
        message: 'Username must start with a letter or number and can only contain letters, numbers, underscores, and dashes',
      });
      return;
    }

    // If the slug matches the initial data (user's current slug), it's valid
    const isOwnSlug = initialData?.slug && slug === initialData.slug;
    if (isOwnSlug) {
      setUsernameError(null);
      form.clearErrors('slug');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingUsername(true);
      setUsernameError(null);
      form.clearErrors('slug');

      try {
        const response = await fetch(
          `/api/user/check-slug?slug=${encodeURIComponent(slug)}`,
        );
        const data = await response.json();

        if (!data.available) {
          setUsernameError('This username is already taken');
          form.setError('slug', {
            type: 'manual',
            message: 'This username is already taken',
          });
        } else {
          setUsernameError(null);
          form.clearErrors('slug');
        }
      } catch {
        // Don't block the user if the check fails
        setUsernameError(null);
        form.clearErrors('slug');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [slug, form, initialData?.slug]);

  const handleSubmit = async (data: BasicProfileFormData) => {
    // Check if there's a form error (which includes slug validation)
    const slugError = form.formState.errors.slug;
    if (slugError) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onNext(data);
    } catch {
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUpload = (publicId: string, secureUrl: string) => {
    // Avatar is already saved via the API endpoint, just update local state
    setCurrentAvatarUrl(secureUrl);

    // Trigger Next.js router refresh to revalidate and update all components
    router.refresh();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-6">
          <div>
            <FormLabel className="mb-4 block">
              Profile Photo <span className="text-muted-foreground font-normal">(Optional)</span>
            </FormLabel>
            <AvatarUpload
              currentAvatarUrl={currentAvatarUrl}
              onUploadComplete={handleAvatarUpload}
              disabled={isSubmitting}
            />
            <p className="text-muted-foreground mt-2 text-xs">
              Upload a photo to help other users recognize you. You can skip this and add one later.
            </p>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your first name" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your last name" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Choose a username"
                        {...field}
                        disabled={isSubmitting || isCheckingUsername}
                      />
                      {isCheckingUsername && (
                        <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-muted-foreground text-sm">
                    3-20 characters. Letters, numbers, underscores, and dashes allowed.
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Display Name <span className="text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="How you want your name to appear"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-muted-foreground text-sm">
                    This is shown to other users instead of your username. Can include spaces, emoji, etc.
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={isSubmitting}
                      placeholder="(555) 123-4567"
                      defaultCountry="US"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-muted-foreground text-sm">
                    Recommended for order updates and security alerts
                  </p>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || isCheckingUsername || !!usernameError}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </form>
    </Form>
  );
}
