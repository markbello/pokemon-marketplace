'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressIndicator } from './ProgressIndicator';
import { BasicProfileStep } from './BasicProfileStep';
import { PreferencesStep } from './PreferencesStep';
import { WelcomeStep } from './WelcomeStep';
import type { BasicProfileFormData, PreferencesFormData, OnboardingFormData } from '@/lib/validations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const STEPS = ['Profile', 'Preferences', 'Welcome'] as const;
const TOTAL_STEPS = STEPS.length;

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<OnboardingFormData>>({});

  // Load existing user data from Management API (more reliable than session)
  useEffect(() => {
    const loadUserData = async () => {
      if (!userLoading && user) {
        try {
          // Fetch fresh user data from Management API to get latest user_metadata
          const response = await fetch('/api/user/me');
          if (response.ok) {
            const data = await response.json();
            const metadata = data.user?.user_metadata || {};
            
            // Only set form data if we have actual metadata fields
            if (metadata.firstName || metadata.lastName || metadata.displayName) {
              setFormData({
                firstName: metadata.firstName || '',
                lastName: metadata.lastName || '',
                displayName: metadata.displayName || '',
                phone: metadata.phone || '',
                ...(metadata.preferences && {
                  emailNotifications: metadata.preferences.emailNotifications ?? true,
                  smsNotifications: metadata.preferences.smsNotifications ?? false,
                  profileVisibility: metadata.preferences.profileVisibility || 'public',
                  preferredCommunication: metadata.preferences.preferredCommunication || 'email',
                }),
              });
            }
          }
        } catch {
          // Fallback to session user data
          if (user?.user_metadata) {
            const metadata = user.user_metadata;
            if (metadata.firstName || metadata.lastName || metadata.displayName) {
              setFormData({
                firstName: metadata.firstName || '',
                lastName: metadata.lastName || '',
                displayName: metadata.displayName || '',
                phone: metadata.phone || '',
                ...(metadata.preferences && {
                  emailNotifications: metadata.preferences.emailNotifications ?? true,
                  smsNotifications: metadata.preferences.smsNotifications ?? false,
                  profileVisibility: metadata.preferences.profileVisibility || 'public',
                  preferredCommunication: metadata.preferences.preferredCommunication || 'email',
                }),
              });
            }
          }
        }
      }
    };

    loadUserData();
  }, [user, userLoading]);

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [user, userLoading, router]);

  const handleBasicProfileSubmit = async (data: BasicProfileFormData) => {
    const updatedData = { ...formData, ...data };
    setFormData(updatedData);
    // Save progress to backend
    try {
      await saveProfileData(updatedData as OnboardingFormData, false);
      // Update local state immediately so next step has the data
      setFormData(updatedData);
    } catch (error) {
      throw error;
    }
  };

  const handlePreferencesSubmit = async (data: PreferencesFormData) => {
    const updatedData = { ...formData, ...data };
    setFormData(updatedData);
    // Save progress to backend
    try {
      await saveProfileData(updatedData as OnboardingFormData, false);
      // Update local state immediately so next step has the data
      setFormData(updatedData);
    } catch (error) {
      throw error;
    }
  };

  const handleComplete = async () => {
    setError(null);

    try {
      // Final save with profileComplete: true
      await saveProfileData(formData as OnboardingFormData, true);

      // Force a page reload to refresh the Auth0 session with updated metadata
      // This ensures the user object reflects the latest changes
      const returnTo = searchParams.get('returnTo') || '/';
      window.location.assign(returnTo);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to complete onboarding. Please try again.',
      );
    }
  };

  const saveProfileData = async (data: OnboardingFormData, profileComplete: boolean) => {
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
        preferences: {
          emailNotifications: data.emailNotifications,
          smsNotifications: data.smsNotifications,
          profileVisibility: data.profileVisibility,
          preferredCommunication: data.preferredCommunication,
        },
        profileComplete,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save profile');
    }

    return response.json();
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
      // Scroll to top on step change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (userLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Determine if this is editing (profile already complete) or new onboarding
  const isEditing = user.user_metadata?.profileComplete === true;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isEditing ? 'Edit Your Profile' : 'Complete Your Profile'}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update your profile information and preferences'
              : "Let's set up your account so you can start buying and selling trading cards"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            stepLabels={STEPS}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="min-h-[400px]">
            {currentStep === 0 && (
              <BasicProfileStep
                initialData={formData}
                onSubmit={handleBasicProfileSubmit}
                onNext={handleNext}
              />
            )}

            {currentStep === 1 && (
              <PreferencesStep
                initialData={formData}
                phoneNumber={formData.phone}
                onSubmit={handlePreferencesSubmit}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 2 && (
              <WelcomeStep
                onComplete={handleComplete}
                userName={formData.displayName || user?.name || undefined}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

