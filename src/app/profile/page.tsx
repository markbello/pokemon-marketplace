'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Phone, User, Save, X, Camera } from 'lucide-react';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { AvatarUploadModal } from '@/components/avatar/AvatarUploadModal';
import { getAvatarUrl } from '@/lib/avatar-utils';
import { getUserMetadata } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  onboardingSchema,
  type OnboardingFormData,
  type BasicProfileFormData,
} from '@/lib/validations';
import { AccountLayout } from '@/components/account/AccountLayout';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [userData, setUserData] = useState<typeof user | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [hasBasicChanges, setHasBasicChanges] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Use fetched user data if available, otherwise fall back to session user
  const displayUser = userData || user;
  const metadata = getUserMetadata(displayUser);

  // Get current avatar URL from user metadata
  useEffect(() => {
    if (displayUser?.user_metadata?.avatar) {
      const avatar = displayUser.user_metadata.avatar;
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || null;
      
      if (avatar.public_id) {
        setCurrentAvatarUrl(getAvatarUrl(avatar.public_id, cloudName, 'large') || avatar.secure_url || null);
      } else if (avatar.secure_url) {
        setCurrentAvatarUrl(avatar.secure_url);
      }
    } else {
      setCurrentAvatarUrl(null);
    }
  }, [displayUser]);

  // Initialize form with current user data - MUST be called before any conditional returns
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: metadata?.firstName || '',
      lastName: metadata?.lastName || '',
      displayName: metadata?.displayName || '',
      phone: metadata?.phone || '',
      emailNotifications: metadata?.preferences?.emailNotifications ?? true,
      smsNotifications: metadata?.preferences?.smsNotifications ?? false,
      profileVisibility: metadata?.preferences?.profileVisibility || 'public',
      preferredCommunication: metadata?.preferences?.preferredCommunication || 'email',
    },
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  // Watch form values
  const displayName = form.watch('displayName');
  const firstName = form.watch('firstName');
  const lastName = form.watch('lastName');
  const phone = form.watch('phone');
  const initialDisplayName = metadata?.displayName;
  const initialFirstName = metadata?.firstName || '';
  const initialLastName = metadata?.lastName || '';
  const initialPhone = metadata?.phone || '';

  // Track if basic info has changed
  useEffect(() => {
    const hasChanged =
      displayName !== initialDisplayName ||
      firstName !== initialFirstName ||
      lastName !== initialLastName ||
      phone !== initialPhone;
    setHasBasicChanges(hasChanged);
  }, [
    displayName,
    firstName,
    lastName,
    phone,
    initialDisplayName,
    initialFirstName,
    initialLastName,
    initialPhone,
  ]);

  // Fetch fresh user data from Management API to get latest user_metadata
  useEffect(() => {
    const loadUserData = async () => {
      if (!isLoading && user) {
        setIsLoadingUserData(true);
        try {
          const response = await fetch('/api/user/me');
          if (response.ok) {
            const data = await response.json();
            setUserData(data.user);
          } else {
            // Fallback to session user
            setUserData(user);
          }
        } catch {
          // Fallback to session user
          setUserData(user);
        } finally {
          setIsLoadingUserData(false);
        }
      } else if (!isLoading && !user) {
        setIsLoadingUserData(false);
      }
    };

    loadUserData();
  }, [user, isLoading]);

  // Update form when userData loads
  useEffect(() => {
    if (userData && metadata) {
      const newValues = {
        firstName: metadata.firstName || '',
        lastName: metadata.lastName || '',
        displayName: metadata.displayName || '',
        phone: metadata.phone || '',
        emailNotifications: metadata.preferences?.emailNotifications ?? true,
        smsNotifications: metadata.preferences?.smsNotifications ?? false,
        profileVisibility: metadata.preferences?.profileVisibility || 'public',
        preferredCommunication: metadata.preferences?.preferredCommunication || 'email',
      };

      // Only reset if values actually changed to avoid triggering change detection
      const currentValues = form.getValues();
      const valuesChanged =
        currentValues.firstName !== newValues.firstName ||
        currentValues.lastName !== newValues.lastName ||
        currentValues.displayName !== newValues.displayName ||
        currentValues.phone !== newValues.phone ||
        currentValues.emailNotifications !== newValues.emailNotifications ||
        currentValues.smsNotifications !== newValues.smsNotifications ||
        currentValues.profileVisibility !== newValues.profileVisibility ||
        currentValues.preferredCommunication !== newValues.preferredCommunication;

      if (valuesChanged) {
        form.reset(newValues);
        setHasBasicChanges(false);
      }
    }
  }, [userData, metadata, form]);

  // Username availability check (when username changes)
  useEffect(() => {
    if (!displayName || displayName.length < 3) {
      return;
    }

    // Skip check if username hasn't changed
    if (displayName === initialDisplayName) {
      form.clearErrors('displayName');
      return;
    }

    // Validate format first
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(displayName)) {
      return; // Let Zod handle format validation
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingUsername(true);
      form.clearErrors('displayName');

      try {
        const response = await fetch(
          `/api/user/check-username?username=${encodeURIComponent(displayName)}`,
        );
        const data = await response.json();

        if (!data.available) {
          form.setError('displayName', {
            type: 'manual',
            message: 'This username is already taken',
          });
        }
      } catch {
        // Silently fail - don't block user if check fails
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [displayName, initialDisplayName, form]);

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Not Authenticated</CardTitle>
            <CardDescription>Please sign in to view your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                window.location.href = '/api/auth/login';
              }}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only check profile completeness after user data is loaded to avoid flash
  const profileComplete = isLoadingUserData ? true : metadata?.profileComplete || false;

  const handleAvatarUpload = async (publicId: string, secureUrl: string) => {
    // Avatar is already saved via the API endpoint, just update local state
    setCurrentAvatarUrl(secureUrl);
    
    // Refresh user data to get updated metadata
    try {
      const meResponse = await fetch('/api/user/me');
      if (meResponse.ok) {
        const meData = await meResponse.json();
        setUserData(meData.user);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }

    // Trigger Next.js router refresh to revalidate and update all components
    router.refresh();

    toast.success('Avatar updated successfully');
  };

  const handleSaveBasicInfo = async (data: BasicProfileFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const currentPrefs = metadata?.preferences || {};
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          displayName: data.displayName,
          phone: data.phone,
          preferences: currentPrefs, // Keep existing preferences
          profileComplete: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }

      // Refresh user data
      const meResponse = await fetch('/api/user/me');
      if (meResponse.ok) {
        const meData = await meResponse.json();
        setUserData(meData.user);
      }

      setSuccess(true);
      setHasBasicChanges(false);
      toast.success('Profile updated successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <AccountLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-2">View and manage your account information</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <AlertDescription className="text-green-900 dark:text-green-100">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Completeness Badge */}
        {!isLoadingUserData && !profileComplete && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Your profile is incomplete. Complete your profile to get started.
                </span>
                <Button asChild size="sm" variant="outline">
                  <a href="/onboarding">Complete Profile</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Your account details and profile picture</CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="group relative cursor-pointer rounded-full transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Edit profile photo"
              >
                <UserAvatar
                  publicId={displayUser?.user_metadata?.avatar?.public_id}
                  avatarUrl={currentAvatarUrl || displayUser?.user_metadata?.avatar?.secure_url || displayUser?.picture || undefined}
                  name={metadata?.displayName || displayUser?.name || undefined}
                  size="large"
                />
                {/* Hover overlay for desktop */}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                {/* Always-visible camera badge for mobile/touch devices - hidden on hover */}
                <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm opacity-100 transition-opacity duration-200 group-hover:opacity-0">
                  <Camera className="h-4 w-4" />
                </div>
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveBasicInfo)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Email - read only */}
                  <InfoField label="Email" value={displayUser?.email || 'Not set'} icon={Mail} />

                  {/* Display Name / Username - always editable */}
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="text-muted-foreground h-4 w-4" />
                          Username
                        </FormLabel>
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
                        <p className="text-muted-foreground text-xs">
                          3-20 characters, letters, numbers, and underscores only
                        </p>
                      </FormItem>
                    )}
                  />

                  {/* First Name - always editable */}
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="text-muted-foreground h-4 w-4" />
                          First Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your first name"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Last Name - always editable */}
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="text-muted-foreground h-4 w-4" />
                          Last Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your last name"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone Number - always editable */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="text-muted-foreground h-4 w-4" />
                          Phone Number (Optional)
                        </FormLabel>
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
                      </FormItem>
                    )}
                  />
                </div>

                {/* Save button - only show when there are changes */}
                {hasBasicChanges && (
                  <div className="flex gap-4 pt-4">
                    <Button type="submit" disabled={isSubmitting || isCheckingUsername}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset({
                          firstName: metadata?.firstName || '',
                          lastName: metadata?.lastName || '',
                          displayName: metadata?.displayName || '',
                          phone: metadata?.phone || '',
                          emailNotifications: metadata?.preferences?.emailNotifications ?? true,
                          smsNotifications: metadata?.preferences?.smsNotifications ?? false,
                          profileVisibility: metadata?.preferences?.profileVisibility || 'public',
                          preferredCommunication:
                            metadata?.preferences?.preferredCommunication || 'email',
                        });
                        setHasBasicChanges(false);
                      }}
                      disabled={isSubmitting}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Account Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Technical details about your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoField label="User ID" value={displayUser?.sub || 'Not available'} copyable />
              <InfoField
                label="Auth Provider"
                value={
                  displayUser?.sub?.split('|')[0] === 'auth0'
                    ? 'Email/Password'
                    : displayUser?.sub?.split('|')[0] || 'Unknown'
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Avatar Upload Modal */}
        <AvatarUploadModal
          open={isAvatarModalOpen}
          onOpenChange={setIsAvatarModalOpen}
          currentAvatarUrl={currentAvatarUrl}
          onUploadComplete={handleAvatarUpload}
        />
      </div>
    </AccountLayout>
  );
}

interface InfoFieldProps {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  optional?: boolean;
  copyable?: boolean;
}

function InfoField({ label, value, icon: Icon, optional, copyable }: InfoFieldProps) {
  const handleCopy = () => {
    if (copyable && value && value !== 'Not available') {
      navigator.clipboard.writeText(value);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="text-muted-foreground h-4 w-4" />}
        <label className="text-muted-foreground text-sm font-medium">
          {label}
          {optional && <span className="text-muted-foreground/70"> (Optional)</span>}
        </label>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">{value}</p>
        {copyable && value && value !== 'Not available' && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy}>
            Copy
          </Button>
        )}
      </div>
    </div>
  );
}
