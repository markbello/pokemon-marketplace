import { headers } from 'next/headers';

/**
 * Get the base URL for the current environment using the actual host header.
 * This ensures redirects (like Stripe success URLs) go to the correct domain.
 *
 * Uses the actual domain the user is visiting (e.g., kado.io), not VERCEL_URL.
 *
 * SERVER-ONLY: Can only be called from server components, API routes, etc.
 */
export async function getBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const host = headersList.get('host');

    if (host) {
      // Determine protocol based on host
      const protocol = host.includes('localhost') ? 'http' : 'https';
      return `${protocol}://${host}`;
    }
  } catch {
    // If headers() fails (e.g., not in a request context), fall back
  }

  // Fallback: use VERCEL_URL if available
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default to localhost for local development
  return 'http://localhost:3000';
}

/**
 * Synchronous version of getBaseUrl for cases where headers() is not available.
 * Less accurate than async version - use getBaseUrl() when possible.
 */
export function getBaseUrlSync(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}
