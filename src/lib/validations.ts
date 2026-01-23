import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { slugSchema, displayNameSchema } from './validations-server';

// Re-export server-safe schemas for client use
export { slugSchema, displayNameSchema };

/**
 * Validation schema for Step 1: Basic Profile
 */
export const basicProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  slug: slugSchema,
  displayName: displayNameSchema,
  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        // Use react-phone-number-input validation for international numbers
        return isValidPhoneNumber(val);
      },
      {
        message: 'Please enter a valid phone number',
      },
    ),
});

export type BasicProfileFormData = z.infer<typeof basicProfileSchema>;

/**
 * Validation schema for Step 2: Preferences
 */
export const preferencesSchema = z.object({
  emailNotifications: z.boolean(),
  profileVisibility: z.enum(['public', 'private']),
});

export type PreferencesFormData = z.infer<typeof preferencesSchema>;

/**
 * Combined schema for the complete onboarding data
 */
export const onboardingSchema = basicProfileSchema.merge(preferencesSchema);

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
