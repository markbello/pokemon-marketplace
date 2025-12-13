import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  routes: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    callback: '/api/auth/callback',
  },
  // Don't set appBaseUrl - let Auth0 SDK detect it from the request headers
  // This allows it to work correctly on preview deployments with unique URLs
});
