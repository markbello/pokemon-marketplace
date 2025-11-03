import { Auth0Client } from '@auth0/nextjs-auth0/server';

/**
 * Get the base URL for the current environment
 * - Uses VERCEL_URL in Vercel deployments (automatically set)
 * - Falls back to APP_BASE_URL if set
 * - Defaults to http://localhost:3000 for local development
 */
function getBaseUrl(): string {
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

export const auth0 = new Auth0Client({
  routes: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    callback: '/api/auth/callback',
  },
  appBaseUrl: getBaseUrl(),
});
