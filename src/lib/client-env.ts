/**
 * Client-side environment detection
 * Safe to use in client components (no next/headers dependency)
 */

/**
 * Detect if we're running in staging based on hostname
 * Returns true for:
 * - localhost
 * - *.vercel.app domains
 * - Any non-kado.io domain
 *
 * Returns false for:
 * - kado.io (production)
 * - www.kado.io (production)
 */
export function isClientStaging(): boolean {
  // Server-side rendering: can't access window
  if (typeof window === 'undefined') {
    return true; // Default to staging during SSR
  }

  const hostname = window.location.hostname;

  // Production domains
  if (hostname === 'kado.io' || hostname === 'www.kado.io') {
    return false;
  }

  // Everything else is staging (localhost, vercel deployments, etc.)
  return true;
}

/**
 * Get runtime environment string based on client hostname
 */
export function getClientEnvironment(): 'prod' | 'staging' {
  return isClientStaging() ? 'staging' : 'prod';
}
