import { z } from 'zod';

/**
 * Server-safe validation schemas
 * These can be imported in API routes without client-side dependencies
 */

/**
 * Slug validation: URL-friendly unique identifier
 * - 3-20 characters
 * - Letters, numbers, underscores, and dashes only
 * - Must start with a letter or number
 */
export const slugSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be 20 characters or less')
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    'Username must start with a letter or number and can only contain letters, numbers, underscores, and dashes',
  )
  .trim();

/**
 * Display name validation: Freeform text for display purposes
 * - Up to 80 characters
 * - Can contain any characters (spaces, emoji, etc.)
 */
export const displayNameSchema = z
  .string()
  .max(80, 'Display name must be 80 characters or less')
  .trim()
  .optional();
