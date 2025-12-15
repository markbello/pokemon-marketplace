import { getAuth0Client } from './auth0';
import { getManagementClient } from './auth0-management';

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
    // Use the dynamically configured Auth0 client so session reads match how cookies were issued.
    const auth0 = await getAuth0Client();
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
