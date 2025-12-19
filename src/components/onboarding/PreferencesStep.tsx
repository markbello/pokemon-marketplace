'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preferencesSchema, type PreferencesFormData } from '@/lib/validations';
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface PreferencesStepProps {
  initialData?: Partial<PreferencesFormData & { phone?: string }>;
  phoneNumber?: string; // Phone number from previous step or existing profile
  onSubmit: (data: PreferencesFormData) => Promise<void>;
  onNext: (data: PreferencesFormData) => void;
  onBack: () => void;
}

export function PreferencesStep({
  initialData,
  phoneNumber,
  onSubmit,
  onNext,
  onBack,
}: PreferencesStepProps) {
  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      emailNotifications: initialData?.emailNotifications ?? true,
      profileVisibility: initialData?.profileVisibility ?? 'public',
    },
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  // Update form values when initialData changes (for editing existing profiles)
  useEffect(() => {
    // Only reset if we have actual preference data
    if (
      initialData &&
      (initialData.emailNotifications !== undefined || initialData.profileVisibility)
    ) {
      form.reset({
        emailNotifications: initialData.emailNotifications ?? true,
        profileVisibility: initialData.profileVisibility ?? 'public',
      });
    }
  }, [initialData, form]);

  const handleSubmit = async (data: PreferencesFormData) => {
    try {
      await onSubmit(data);
      onNext(data);
    } catch {
      // Error is handled by parent component
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notification Preferences</h3>

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
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Privacy Settings</h3>

            <FormField
              control={form.control}
              name="profileVisibility"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Profile Visibility</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-y-0 space-x-3">
                        <FormControl>
                          <RadioGroupItem value="public" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Public - Anyone can see your profile
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

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button type="submit" className="flex-1">
            Continue
          </Button>
        </div>
      </form>
    </Form>
  );
}
