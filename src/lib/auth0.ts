import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getBaseUrl } from '@/lib/utils';

export const auth0 = new Auth0Client({
  routes: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    callback: '/api/auth/callback',
  },
  appBaseUrl: getBaseUrl(),
});
