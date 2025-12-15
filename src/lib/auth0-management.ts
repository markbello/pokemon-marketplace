import { ManagementClient } from 'auth0';
import { getAuth0ManagementCredentials } from '@/lib/env';

export function getManagementClient(): ManagementClient {
  const { domain, clientId, clientSecret } = getAuth0ManagementCredentials();

  return new ManagementClient({
    domain,
    clientId,
    clientSecret,
  });
}
