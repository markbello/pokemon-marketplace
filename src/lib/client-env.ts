/**
 * Client-side environment utilities
 *
 * Note: With dual Vercel projects (PM-67), environment detection is no longer needed.
 * Each deployment has its own environment variables configured in Vercel.
 *
 * This file is kept for backwards compatibility but these functions are deprecated.
 */

/**
 * @deprecated No longer needed with dual Vercel projects.
 * Environment is determined by which Vercel project is deployed.
 */
export function isClientStaging(): boolean {
  // For backwards compatibility, return true for localhost
  if (typeof window === 'undefined') {
    return true;
  }
  return window.location.hostname === 'localhost';
}

/**
 * @deprecated No longer needed with dual Vercel projects.
 * Environment is determined by which Vercel project is deployed.
 */
export function getClientEnvironment(): 'prod' | 'staging' {
  return isClientStaging() ? 'staging' : 'prod';
}
