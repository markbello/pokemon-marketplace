import { headers } from 'next/headers';

/**
 * Gets the runtime environment (production vs staging vs development).
 * Uses RUNTIME_ENV from Vercel project configuration.
 */
export function getRuntimeEnv(): 'production' | 'staging' | 'development' {
  const runtimeEnv = process.env.RUNTIME_ENV;

  if (runtimeEnv === 'production' || runtimeEnv === 'staging') {
    return runtimeEnv;
  }

  // Default to development for local development
  return 'development';
}

/**
 * Checks if the current environment is production.
 */
export function isProduction(): boolean {
  return getRuntimeEnv() === 'production';
}

/**
 * Checks if the current environment is staging or development.
 */
export function isStaging(): boolean {
  const env = getRuntimeEnv();
  return env === 'staging' || env === 'development';
}

/**
 * Gets the full app base URL from request headers.
 * This is critical for Auth0 and other services that need the exact origin.
 * Returns the full URL with protocol (e.g., "https://kado.io" or "https://staging.kado.io")
 */
export async function getAppBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();

    // Try x-forwarded-proto and x-forwarded-host first (most reliable with proxies)
    const protocol = headersList.get('x-forwarded-proto') || 'https';
    const host = headersList.get('x-forwarded-host') || headersList.get('host');

    if (!host) {
      throw new Error('Unable to determine host from request headers');
    }

    return `${protocol}://${host}`;
  } catch (error) {
    // Fallback to localhost for development
    if (getRuntimeEnv() === 'development') {
      return 'http://localhost:3000';
    }
    throw error;
  }
}

// === ENVIRONMENT VARIABLE GETTERS ===

export function getStripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY!;
}

export function getStripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY!;
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

export function getAuth0ManagementCredentials(): {
  domain: string;
  clientId: string;
  clientSecret: string;
} {
  return {
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
    clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
  };
}

/**
 * Gets Auth0 SDK credentials for the current environment.
 * These are used by the @auth0/nextjs-auth0 SDK.
 */
export function getAuth0SdkCredentials(): {
  issuerBaseUrl: string;
  clientId: string;
  clientSecret: string;
  secret: string;
} {
  const domain = process.env.AUTH0_DOMAIN!;
  return {
    issuerBaseUrl: `https://${domain}`,
    clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID!,
    clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET!,
    secret: process.env.AUTH0_SECRET!,
  };
}

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL!;
}

export function getShippoToken(): string {
  return process.env.SHIPPO_TOKEN!;
}

export function getShippoWebhookSecret(): string | undefined {
  return process.env.SHIPPO_WEBHOOK_SECRET;
}
