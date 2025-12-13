import { ManagementClient } from 'auth0';
import { getAuth0ManagementCredentialsSync } from '@/lib/env';

export function getManagementClient(): ManagementClient {
  const { domain, clientId, clientSecret } = getAuth0ManagementCredentialsSync();

  return new ManagementClient({
    domain,
    clientId,
    clientSecret,
  });
}
