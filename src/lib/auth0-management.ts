import { ManagementClient } from 'auth0';

export function getManagementClient(): ManagementClient {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
  const clientSecret =
    process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    throw new Error('Missing Auth0 Management API credentials');
  }

  return new ManagementClient({
    domain,
    clientId,
    clientSecret,
  });
}
