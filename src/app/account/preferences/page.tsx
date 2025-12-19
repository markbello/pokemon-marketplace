'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountLayout } from '@/components/account/AccountLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  onboardingSchema,
  type OnboardingFormData,
  type PreferencesFormData,
} from '@/lib/validations';
import { getUserMetadata } from '@/lib/auth-utils';

export default function PreferencesPage() {
  const { user, isLoading } = useUser();
  const [userData, setUserData] = useState<typeof user | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      profileVisibility: metadata?.preferences?.profileVisibility || 'public',
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
        profileVisibility: metadata?.preferences?.profileVisibility || 'public',
      });
    }
  }, [displayUser, form]);

  // Handle preference changes
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
      if (field === 'emailNotifications') {
        form.setValue(field, value as boolean);
      } else if (field === 'profileVisibility') {
        form.setValue(field, value as 'public' | 'private');
      }

      // Show success toast with a friendly message
      const fieldLabels: Record<keyof PreferencesFormData, string> = {
        emailNotifications: 'Email notifications',
        profileVisibility: 'Profile visibility',
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
        if (field === 'emailNotifications') {
          form.setValue(field, originalValue as boolean);
        } else if (field === 'profileVisibility') {
          form.setValue(field, originalValue as 'public' | 'private');
        }
      }
    }
  };

  if (isLoading || isLoadingUserData) {
    return (
      <AccountLayout>
        <div className="space-y-6">
          <div className="mb-6">
            <h1 className="mb-2 text-3xl font-bold">Preferences</h1>
            <p className="text-muted-foreground">Your notification and privacy settings</p>
          </div>
          {/* Reserve space for content card to prevent layout shift */}
          <Card>
            <CardContent className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="text-muted-foreground mx-auto mb-4 h-8 w-8 animate-spin" />
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
          <h1 className="mb-2 text-3xl font-bold">Preferences</h1>
          <p className="text-muted-foreground">Your notification and privacy settings</p>
        </div>

        {/* Error Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
}
