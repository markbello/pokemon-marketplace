import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL for the current environment
 * - Uses VERCEL_URL in Vercel deployments (automatically set)
 * - Falls back to APP_BASE_URL if set
 * - Defaults to http://localhost:3000 for local development
 */
export function getBaseUrl(): string {
  // Vercel automatically provides VERCEL_URL for all deployments (preview, staging, production)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Allow explicit override via APP_BASE_URL
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  // Default to localhost for development
  return 'http://localhost:3000';
}
