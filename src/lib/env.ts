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

// Helper function to get required env vars
function getRequiredEnv(name: string, label?: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}${label ? ` (${label})` : ''}`);
  }
  return value;
}

// Helper function to get optional env vars
function getOptionalEnv(name: string): string | undefined {
  return process.env[name];
}

// === ENVIRONMENT VARIABLE GETTERS ===

export function getStripeSecretKey(): string {
  return getRequiredEnv('STRIPE_SECRET_KEY', 'Stripe secret key');
}

export function getStripePublishableKey(): string {
  return getRequiredEnv('STRIPE_PUBLISHABLE_KEY', 'Stripe publishable key');
}

export function getStripeWebhookSecret(): string | undefined {
  // optional in dev (signature verification skipped)
  return getOptionalEnv('STRIPE_WEBHOOK_SECRET');
}

export function getAuth0ManagementCredentials(): {
  domain: string;
  clientId: string;
  clientSecret: string;
} {
  const domain = getRequiredEnv('AUTH0_DOMAIN', 'Auth0 domain');
  const clientId = getRequiredEnv('AUTH0_MANAGEMENT_CLIENT_ID', 'Auth0 management client id');
  const clientSecret = getRequiredEnv(
    'AUTH0_MANAGEMENT_CLIENT_SECRET',
    'Auth0 management client secret',
  );

  return { domain, clientId, clientSecret };
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
  const domain = getRequiredEnv('AUTH0_DOMAIN', 'Auth0 domain');
  const issuerBaseUrl = `https://${domain}`;

  const clientId = getRequiredEnv('AUTH0_MANAGEMENT_CLIENT_ID', 'Auth0 client ID');
  const clientSecret = getRequiredEnv('AUTH0_MANAGEMENT_CLIENT_SECRET', 'Auth0 client secret');

  // AUTH0_SECRET is used for session encryption
  const secret = getRequiredEnv('AUTH0_SECRET', 'Auth0 secret');

  return { issuerBaseUrl, clientId, clientSecret, secret };
}

export function getDatabaseUrl(): string {
  return getRequiredEnv('DATABASE_URL', 'Database URL');
}

export function getShippoToken(): string {
  return getRequiredEnv('SHIPPO_TOKEN', 'Shippo API token');
}

export function getShippoWebhookSecret(): string | undefined {
  // Optional - used for webhook signature verification
  return getOptionalEnv('SHIPPO_WEBHOOK_SECRET');
}

// === PSA API CONFIG ===
export function getPSAApiKey(): string | undefined {
  return getOptionalEnv('PSA_API_KEY');
}

export function getPSAApiBaseUrl(): string {
  return getOptionalEnv('PSA_API_BASE_URL') ?? 'https://api.psacard.com';
}

export function getPSAApiEndpoint(): string | undefined {
  return getOptionalEnv('PSA_API_ENDPOINT');
}
