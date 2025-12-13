import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getAuth0SdkCredentials, getAppBaseUrl } from './env';

/**
 * Gets Auth0 configuration dynamically based on request context.
 * This ensures the correct credentials are used for each environment.
 */
export async function getAuth0Config() {
  const credentials = await getAuth0SdkCredentials();
  const baseUrl = await getAppBaseUrl();

  return {
    routes: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      callback: '/api/auth/callback',
    },
    // Explicitly set these from our environment detection
    appBaseUrl: baseUrl,
    issuerBaseUrl: credentials.issuerBaseUrl,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    secret: credentials.secret,
  };
}

/**
 * Creates an Auth0Client with dynamic configuration.
 * Use this in API routes and server components where we need auth functionality.
 */
export async function getAuth0Client(): Promise<Auth0Client> {
  const config = await getAuth0Config();
  return new Auth0Client(config);
}

// Default client for module-level usage (fallback)
// This will use environment variables if they're set, but getAuth0Client() is preferred
export const auth0 = new Auth0Client({
  routes: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    callback: '/api/auth/callback',
  },
});
