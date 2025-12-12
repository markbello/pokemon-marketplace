import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the base URL for the current environment
 * Priority order:
 * 1. APP_BASE_URL (explicit override)
 * 2. VERCEL_URL (automatically set by Vercel for all deployments)
 * 3. NEXT_PUBLIC_APP_URL (alternative explicit override)
 * 4. Defaults to http://localhost:3000 for local development
 */
export function getBaseUrl(): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Alternative explicit override
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Default to localhost for development
  return 'http://localhost:3000';
}
