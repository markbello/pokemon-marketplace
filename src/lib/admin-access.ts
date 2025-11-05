import { auth0 } from './auth0';
import { ManagementClient } from 'auth0';

/**
 * Get Auth0 Management API client
 */
function getManagementClient(): ManagementClient {
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

/**
 * Check if a user has admin role
 * Admin role can be stored in:
 * 1. Auth0 Roles (via Roles API) - recommended
 * 2. app_metadata.roles array - fallback
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const management = getManagementClient();
    
    // First, try to get roles via Auth0 Roles API (recommended way)
    try {
      const rolesResponse = await management.users.getRoles({ id: userId });
      const roles = rolesResponse.data || [];
      const roleNames = roles.map((role: { name: string }) => role.name);
      
      if (roleNames.includes('admin')) {
        console.log(`User ${userId} has admin role via Roles API`);
        return true;
      }
    } catch (rolesError) {
      // If Roles API fails, fall back to app_metadata check
      console.log('Roles API check failed, falling back to app_metadata:', rolesError);
    }
    
    // Fallback: Check app_metadata.roles
    const response = await management.users.get({ id: userId });
    const userData = response.data?.data || response.data || response;
    
    // Check app_metadata.roles
    const appMetadataRoles = userData.app_metadata?.roles || [];
    if (Array.isArray(appMetadataRoles) && appMetadataRoles.includes('admin')) {
      console.log(`User ${userId} has admin role via app_metadata`);
      return true;
    }
    
    // Check user_metadata.roles (some setups use this)
    const userMetadataRoles = userData.user_metadata?.roles || [];
    if (Array.isArray(userMetadataRoles) && userMetadataRoles.includes('admin')) {
      console.log(`User ${userId} has admin role via user_metadata`);
      return true;
    }
    
    // Debug logging
    console.log(`User ${userId} admin check - app_metadata:`, userData.app_metadata);
    console.log(`User ${userId} admin check - user_metadata:`, userData.user_metadata);
    
    return false;
  } catch (error) {
    console.error(`Error checking admin status for user ${userId}:`, error);
    return false;
  }
}

/**
 * Check if current session user is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.sub) {
      return false;
    }
    return await isAdmin(session.user.sub);
  } catch (error) {
    console.error('Error checking current user admin status:', error);
    return false;
  }
}

