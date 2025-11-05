import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL for the current environment
 * Priority order:
 * 1. APP_BASE_URL (explicit override, highest priority - use for production custom domains)
 * 2. VERCEL_URL (automatically set by Vercel for all deployments)
 * 3. NEXT_PUBLIC_APP_URL (alternative explicit override)
 * 4. Defaults to http://localhost:3000 for local development
 */
export function getBaseUrl(): string {
  // Explicit override - highest priority (use this for production custom domains)
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  // Alternative explicit override
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Vercel automatically provides VERCEL_URL for all deployments (preview, staging, production)
  // Note: This may be a preview URL, not your custom domain. Use APP_BASE_URL for custom domains.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default to localhost for development
  return 'http://localhost:3000';
}
