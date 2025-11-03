/**
 * User type from Auth0 - inferred from useUser hook
 */
type User = NonNullable<ReturnType<typeof import('@auth0/nextjs-auth0').useUser>['user']>;

/**
 * Check if a user's profile is complete
 * Profile is considered complete if user_metadata.profileComplete is true
 * Returns true if profileComplete is explicitly true, false otherwise
 * This means missing user_metadata is treated as incomplete, but we're lenient in middleware
 */
export function isProfileComplete(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  const profileComplete = user.user_metadata?.profileComplete;
  // Only return true if explicitly set to true
  // undefined or false both return false
  return profileComplete === true;
}

/**
 * Get user metadata with type safety
 */
export function getUserMetadata(user: User | null | undefined) {
  if (!user) {
    return null;
  }

  return user.user_metadata || {};
}

/**
 * Check if a route should bypass profile completeness check
 */
export function shouldBypassProfileCheck(pathname: string): boolean {
  const bypassRoutes = [
    '/api/auth', // Auth routes (login, logout, callback)
    '/api/user', // User API routes
    '/onboarding', // Onboarding page itself
    '/profile', // Profile page (users should be able to view their profile)
    '/_next', // Next.js internal routes
    '/favicon.ico',
    '/sitemap.xml',
    '/robots.txt',
  ];

  return bypassRoutes.some((route) => pathname.startsWith(route));
}
