import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { detectAppEnvironment } from './env';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the base URL for the current environment
 * Priority order:
 * 1. APP_BASE_URL_PROD / APP_BASE_URL_STAGE (env-specific overrides)
 * 2. VERCEL_URL (automatically set by Vercel for all deployments)
 * 3. APP_BASE_URL (legacy explicit override)
 * 4. NEXT_PUBLIC_APP_URL (alternative explicit override)
 * 5. Defaults to http://localhost:3000 for local development
 */
export function getBaseUrl(): string {
  const appEnv = detectAppEnvironment();

  if (appEnv.isProduction && process.env.APP_BASE_URL_PROD) {
    return process.env.APP_BASE_URL_PROD;
  }

  if ((appEnv.isStaging || appEnv.isPreview || appEnv.isLocal) && process.env.APP_BASE_URL_STAGE) {
    return process.env.APP_BASE_URL_STAGE;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Legacy explicit override
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  // Alternative explicit override
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Default to localhost for development
  return 'http://localhost:3000';
}
