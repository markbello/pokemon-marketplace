'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Phone, User, Save, X } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  onboardingSchema,
  type OnboardingFormData,
  type BasicProfileFormData,
  type PreferencesFormData,
} from '@/lib/validations';

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const [userData, setUserData] = useState<typeof user | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [hasBasicChanges, setHasBasicChanges] = useState(false);

  // Use fetched user data if available, otherwise fall back to session user
  const displayUser = userData || user;
  const metadata = getUserMetadata(displayUser);

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

  const userInitials =
    displayUser?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    displayUser?.email?.[0].toUpperCase() ||
    'U';

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

  const handlePreferenceChange = async (
    field: keyof PreferencesFormData,
    value: boolean | string,
  ) => {
    try {
      const currentBasic = {
        firstName: metadata?.firstName || '',
        lastName: metadata?.lastName || '',
        displayName: metadata?.displayName || '',
        phone: metadata?.phone || '',
      };

      const currentPrefs = metadata?.preferences || {};
      const updatedPrefs = {
        ...currentPrefs,
        [field]: value,
      };

      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...currentBasic,
          preferences: updatedPrefs,
          profileComplete: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update preference');
      }

      // Refresh user data
      const meResponse = await fetch('/api/user/me');
      if (meResponse.ok) {
        const meData = await meResponse.json();
        setUserData(meData.user);
      }

      // Update form to reflect the change
      if (field === 'emailNotifications' || field === 'smsNotifications') {
        form.setValue(field, value as boolean);
      } else if (field === 'profileVisibility') {
        form.setValue(field, value as 'public' | 'private');
      } else if (field === 'preferredCommunication') {
        form.setValue(field, value as 'email' | 'sms' | 'both');
      }

      // Show success toast with a friendly message
      const fieldLabels: Record<keyof PreferencesFormData, string> = {
        emailNotifications: 'Email notifications',
        smsNotifications: 'SMS notifications',
        profileVisibility: 'Profile visibility',
        preferredCommunication: 'Communication preference',
      };
      const fieldLabel = fieldLabels[field] || field;
      toast.success(`${fieldLabel} updated`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update preference';
      setError(errorMessage);
      toast.error(errorMessage);
      // Revert the form value on error
      const originalValue = metadata?.preferences?.[field];
      if (originalValue !== undefined) {
        if (field === 'emailNotifications' || field === 'smsNotifications') {
          form.setValue(field, originalValue as boolean);
        } else if (field === 'profileVisibility') {
          form.setValue(field, originalValue as 'public' | 'private');
        } else if (field === 'preferredCommunication') {
          form.setValue(field, originalValue as 'email' | 'sms' | 'both');
        }
      }
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
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
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={displayUser?.picture || undefined}
                  alt={displayUser?.name || 'User'}
                />
                <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
              </Avatar>
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

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Your notification and privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <div className="space-y-6">
                {/* Notification Preferences */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold">Notification Preferences</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Receive updates about orders, promotions, and marketplace news
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                handlePreferenceChange('emailNotifications', checked);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="smsNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">SMS Notifications</FormLabel>
                            <FormDescription>
                              Get text alerts for order updates and security notifications
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                handlePreferenceChange('smsNotifications', checked);
                              }}
                              disabled={!form.watch('phone')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Privacy Settings */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold">Privacy Settings</h3>
                  <FormField
                    control={form.control}
                    name="profileVisibility"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Profile Visibility</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              field.onChange(value);
                              handlePreferenceChange('profileVisibility', value);
                            }}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-y-0 space-x-3">
                              <FormControl>
                                <RadioGroupItem value="public" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Public - Your profile is visible to everyone
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-y-0 space-x-3">
                              <FormControl>
                                <RadioGroupItem value="private" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Private - Only you can see your profile
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Communication Preference */}
                <div>
                  <h3 className="mb-4 text-sm font-semibold">Communication Preference</h3>
                  <FormField
                    control={form.control}
                    name="preferredCommunication"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Preferred Communication Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              field.onChange(value);
                              handlePreferenceChange('preferredCommunication', value);
                            }}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-y-0 space-x-3">
                              <FormControl>
                                <RadioGroupItem value="email" />
                              </FormControl>
                              <FormLabel className="font-normal">Email</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-y-0 space-x-3">
                              <FormControl>
                                <RadioGroupItem value="sms" />
                              </FormControl>
                              <FormLabel className="font-normal">SMS</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-y-0 space-x-3">
                              <FormControl>
                                <RadioGroupItem value="both" />
                              </FormControl>
                              <FormLabel className="font-normal">Both Email & SMS</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
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
      </div>
    </div>
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
