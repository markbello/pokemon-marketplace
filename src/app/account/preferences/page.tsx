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

  if (isLoading || isLoadingUserData) {
    return (
      <AccountLayout>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Preferences</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Preferences</h1>
          <p className="text-muted-foreground mt-2">Your notification and privacy settings</p>
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
      </div>
    </AccountLayout>
  );
}
