'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

interface BasicProfileStepProps {
  initialData?: Partial<BasicProfileFormData>;
  onSubmit: (data: BasicProfileFormData) => Promise<void>;
  onNext: (data: BasicProfileFormData) => void;
}

export function BasicProfileStep({ initialData, onSubmit, onNext }: BasicProfileStepProps) {
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BasicProfileFormData>({
    resolver: zodResolver(basicProfileSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      displayName: initialData?.displayName || '',
      phone: initialData?.phone || '',
    },
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  // Update form values when initialData changes (for editing existing profiles)
  useEffect(() => {
    // Only reset if we have actual data (not just an empty object)
    if (initialData && (initialData.firstName || initialData.lastName || initialData.displayName)) {
      form.reset({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        displayName: initialData.displayName || '',
        phone: initialData.phone || '',
      });
    }
  }, [initialData, form]);

  const displayName = form.watch('displayName');

  // Debounced username availability check
  useEffect(() => {
    if (!displayName || displayName.length < 3) {
      setUsernameError(null);
      form.clearErrors('displayName');
      return;
    }

    // Validate format first
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(displayName)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      form.setError('displayName', {
        type: 'manual',
        message: 'Username can only contain letters, numbers, and underscores',
      });
      return;
    }

    // If the username matches the initial data (user's current username), it's valid
    const isOwnUsername = initialData?.displayName && displayName === initialData.displayName;
    if (isOwnUsername) {
      setUsernameError(null);
      form.clearErrors('displayName');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingUsername(true);
      setUsernameError(null);
      form.clearErrors('displayName');

      try {
        const response = await fetch(
          `/api/user/check-username?username=${encodeURIComponent(displayName)}`,
        );
        const data = await response.json();

        if (!data.available) {
          setUsernameError('This username is already taken');
          form.setError('displayName', {
            type: 'manual',
            message: 'This username is already taken',
          });
        } else {
          setUsernameError(null);
          form.clearErrors('displayName');
        }
      } catch {
        // Don't block the user if the check fails
        setUsernameError(null);
        form.clearErrors('displayName');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [displayName, form, initialData?.displayName]);

  const handleSubmit = async (data: BasicProfileFormData) => {
    // Check if there's a form error (which includes username validation)
    const displayNameError = form.formState.errors.displayName;
    if (displayNameError) {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
            name="displayName"
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
                  3-20 characters, letters, numbers, and underscores only
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
