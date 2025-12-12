import { ManagementClient } from 'auth0';
import { getAuth0Config, detectAppEnvironment } from './env';

export function getManagementClient(): ManagementClient {
  const appEnv = detectAppEnvironment();
  const { domain, managementClientId, managementClientSecret } = getAuth0Config(appEnv);

  return new ManagementClient({
    domain,
    clientId: managementClientId,
    clientSecret: managementClientSecret,
  });
}
