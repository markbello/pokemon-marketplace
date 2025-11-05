'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Phone, User, Save, X, Camera } from 'lucide-react';
import { UserAvatar } from '@/components/avatar/UserAvatar';
import { AvatarUploadModal } from '@/components/avatar/AvatarUploadModal';
import { getAvatarUrl } from '@/lib/avatar-utils';
import { getUserMetadata } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
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

  // Initialize form with current user data
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

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const data = await response.json();
          setUserData(data.user);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    if (!isLoading) {
      fetchUserData();
    }
  }, [isLoading]);

  // Update form when user data changes
  useEffect(() => {
    if (displayUser) {
      const metadata = getUserMetadata(displayUser);
      form.reset({
        firstName: metadata?.firstName || '',
        lastName: metadata?.lastName || '',
        displayName: metadata?.displayName || '',
        phone: metadata?.phone || '',
        emailNotifications: metadata?.preferences?.emailNotifications ?? true,
        smsNotifications: metadata?.preferences?.smsNotifications ?? false,
        profileVisibility: metadata?.preferences?.profileVisibility || 'public',
        preferredCommunication: metadata?.preferences?.preferredCommunication || 'email',
      });
    }
  }, [displayUser, form]);

  // Update current avatar URL when user data changes
  useEffect(() => {
    if (displayUser) {
      const avatarUrl = getAvatarUrl(displayUser);
      setCurrentAvatarUrl(avatarUrl);
    }
  }, [displayUser]);

  // Track basic info changes
  const basicInfo = form.watch(['firstName', 'lastName', 'displayName', 'phone']);
  useEffect(() => {
    const hasChanges =
      basicInfo[0] !== (metadata?.firstName || '') ||
      basicInfo[1] !== (metadata?.lastName || '') ||
      basicInfo[2] !== (metadata?.displayName || '') ||
      basicInfo[3] !== (metadata?.phone || '');
    setHasBasicChanges(hasChanges);
  }, [basicInfo, metadata]);

  // Check if profile is complete
  const profileComplete = metadata?.profileComplete === true;

  // Handle avatar upload success
  const handleAvatarUploadSuccess = () => {
    // Refresh user data to get updated avatar
    fetch('/api/user/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserData(data.user);
          const newAvatarUrl = getAvatarUrl(data.user);
          setCurrentAvatarUrl(newAvatarUrl);
        }
      })
      .catch((err) => console.error('Error refreshing user data:', err));
  };

  // Handle basic info save
  const handleSaveBasicInfo = async () => {
    if (!form.formState.isValid) {
      form.trigger();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const currentBasic = {
        firstName: metadata?.firstName || '',
        lastName: metadata?.lastName || '',
        displayName: metadata?.displayName || '',
        phone: metadata?.phone || '',
      };

      const currentPrefs = metadata?.preferences || {};

      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: form.getValues('firstName'),
          lastName: form.getValues('lastName'),
          displayName: form.getValues('displayName'),
          phone: form.getValues('phone'),
          preferences: currentPrefs,
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
        setHasBasicChanges(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isLoadingUserData) {
    return (
      <AccountLayout>
        <div className="space-y-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Profile</h1>
            <p className="text-muted-foreground">View and manage your account information</p>
          </div>
          {/* Reserve space for content cards to prevent layout shift */}
          <Card>
            <CardContent className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Profile</h1>
          <p className="text-muted-foreground">View and manage your account information</p>
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
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Your personal information and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <UserAvatar
                  publicId={getUserMetadata(displayUser)?.avatar?.public_id}
                  avatarUrl={currentAvatarUrl || undefined}
                  name={displayUser?.user_metadata?.displayName || displayUser?.name || undefined}
                  size="large"
                />
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  aria-label="Change avatar"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Profile Picture</p>
                <p className="text-sm text-muted-foreground">
                  Click the camera icon to upload a new profile picture
                </p>
              </div>
            </div>

            <Form {...form}>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John" />
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
                        <Input {...field} placeholder="Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} placeholder="johndoe" />
                          {isCheckingUsername && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground">
                        This is how your name will appear to other users
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput {...field} placeholder="+1 (555) 000-0000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {hasBasicChanges && (
                <div className="flex justify-end gap-3 pt-4 border-t">
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
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSaveBasicInfo} disabled={isSubmitting}>
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
                </div>
              )}
            </Form>
          </CardContent>
        </Card>

        {/* Account Information Card (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details (read-only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {displayUser?.email || 'Not available'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">User ID</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {displayUser?.sub ? displayUser.sub.slice(0, 20) + '...' : 'Not available'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onSuccess={handleAvatarUploadSuccess}
        currentAvatarUrl={currentAvatarUrl}
      />
    </AccountLayout>
  );
}

