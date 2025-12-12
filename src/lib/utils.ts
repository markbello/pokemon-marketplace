import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the base URL for the current environment
 * Priority order:
 * 1. VERCEL_URL (automatically set by Vercel for all deployments)
 * 2. Defaults to http://localhost:3000 for local development
 */
export function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default to localhost for development
  return 'http://localhost:3000';
}
