import { headers } from 'next/headers';

export type RuntimeEnvironment = 'prod' | 'staging';

const PROD_HOSTNAMES = new Set(['kado.io', 'www.kado.io']);
const STAGING_HOSTNAMES = new Set(['staging.kado.io']);

function normalizeHostname(hostname: string | undefined): string | undefined {
  if (!hostname) return undefined;
  return hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/:\d+$/, '');
}

/**
 * Gets the actual hostname from the request headers.
 * This returns the domain the user is actually visiting (e.g., "kado.io"),
 * not Vercel's internal routing URL.
 */
async function getActualHostname(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    return normalizeHostname(host || undefined);
  } catch {
    // headers() can only be called in server contexts (API routes, server components)
    // If we're in a different context (e.g., module initialization), return undefined
    return undefined;
  }
}

/**
 * Gets the full app base URL from request headers.
 * This is critical for Auth0 and other services that need the exact origin.
 * Returns the full URL with protocol (e.g., "https://kado.io" or "https://preview-abc.vercel.app")
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
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000';
    }
    throw error;
  }
}

/**
 * Fallback: Gets hostname from VERCEL_URL for module-level initialization.
 * This is less accurate but works when headers() is not available.
 */
function getFallbackHostname(): string | undefined {
  const vercelUrl = process.env.VERCEL_URL;
  return normalizeHostname(vercelUrl);
}

/**
 * Core environment detection logic.
 */
function detectEnvironmentFromHostname(hostname: string | undefined): RuntimeEnvironment {
  // Preview deployments (.vercel.app) → staging
  if (hostname?.endsWith('.vercel.app')) {
    return 'staging';
  }

  // Explicit staging domain → staging
  if (hostname && STAGING_HOSTNAMES.has(hostname)) {
    return 'staging';
  }

  // Production domains → prod
  if (hostname && PROD_HOSTNAMES.has(hostname)) {
    return 'prod';
  }

  // Safe default: Local dev or unknown host: treat as staging for safety
  return 'staging';
}

/**
 * Detects the runtime environment based on the actual hostname from request headers.
 * PREFERRED: Use this in server components and API routes for accurate detection.
 */
export async function detectRuntimeEnvironment(): Promise<RuntimeEnvironment> {
  const hostname = await getActualHostname();
  return detectEnvironmentFromHostname(hostname);
}

/**
 * Synchronous environment detection using VERCEL_URL fallback.
 * USE ONLY: For module-level initialization where headers() is not available.
 * Less accurate than async version - use detectRuntimeEnvironment() when possible.
 */
export function detectRuntimeEnvironmentSync(): RuntimeEnvironment {
  const hostname = getFallbackHostname();
  return detectEnvironmentFromHostname(hostname);
}

type EnvPickOptions = {
  required?: boolean;
  label?: string;
};

/**
 * Picks the correct environment variable based on detected environment.
 * PREFERRED: Use this in server components and API routes.
 */
async function pick(base: string, options?: EnvPickOptions): Promise<string | undefined> {
  const env = await detectRuntimeEnvironment();
  const suffix = env === 'prod' ? 'PROD' : 'STAGING';

  const value = process.env[`${base}_${suffix}`];

  if (!value && options?.required) {
    throw new Error(
      `Missing env var: ${base}_${suffix}${options.label ? ` (${options.label})` : ''}`,
    );
  }

  return value;
}

/**
 * Synchronous version using VERCEL_URL fallback.
 * USE ONLY: For module-level initialization.
 */
function pickSync(base: string, options?: EnvPickOptions): string | undefined {
  const env = detectRuntimeEnvironmentSync();
  const suffix = env === 'prod' ? 'PROD' : 'STAGING';

  const value = process.env[`${base}_${suffix}`];

  if (!value && options?.required) {
    throw new Error(
      `Missing env var: ${base}_${suffix}${options.label ? ` (${options.label})` : ''}`,
    );
  }

  return value;
}

// === ASYNC VERSIONS (PREFERRED) ===

export async function getStripeSecretKey(): Promise<string> {
  return (await pick('STRIPE_SECRET_KEY', { required: true, label: 'Stripe secret key' }))!;
}

export async function getStripePublishableKey(): Promise<string> {
  return (await pick('STRIPE_PUBLISHABLE_KEY', {
    required: true,
    label: 'Stripe publishable key',
  }))!;
}

export async function getStripeWebhookSecret(): Promise<string | undefined> {
  // optional in dev (signature verification skipped)
  return pick('STRIPE_WEBHOOK_SECRET');
}

export async function getAuth0ManagementCredentials(): Promise<{
  domain: string;
  clientId: string;
  clientSecret: string;
}> {
  const domain = (await pick('AUTH0_DOMAIN', { required: true, label: 'Auth0 domain' }))!;
  const clientId = (await pick('AUTH0_MANAGEMENT_CLIENT_ID', {
    required: true,
    label: 'Auth0 management client id',
  }))!;
  const clientSecret = (await pick('AUTH0_MANAGEMENT_CLIENT_SECRET', {
    required: true,
    label: 'Auth0 management client secret',
  }))!;

  return { domain, clientId, clientSecret };
}

/**
 * Gets Auth0 SDK credentials for the current environment.
 * Reuses the existing AUTH0_DOMAIN_PROD/AUTH0_DOMAIN_STAGING variables.
 * These are used by the @auth0/nextjs-auth0 SDK.
 */
export async function getAuth0SdkCredentials(): Promise<{
  issuerBaseUrl: string;
  clientId: string;
  clientSecret: string;
  secret: string;
}> {
  // Reuse existing AUTH0_DOMAIN_PROD/AUTH0_DOMAIN_STAGING
  const domain = (await pick('AUTH0_DOMAIN', { required: true, label: 'Auth0 domain' }))!;
  const issuerBaseUrl = `https://${domain}`;

  // Get client credentials with _PROD/_STAGING suffix
  const clientId = (await pick('AUTH0_MANAGEMENT_CLIENT_ID', {
    required: true,
    label: 'Auth0 client ID',
  }))!;
  const clientSecret = (await pick('AUTH0_MANAGEMENT_CLIENT_SECRET', {
    required: true,
    label: 'Auth0 client secret',
  }))!;

  // AUTH0_SECRET is shared across environments (used for session encryption)
  const secret = process.env.AUTH0_SECRET;
  if (!secret) {
    throw new Error('Missing required env var: AUTH0_SECRET');
  }

  return { issuerBaseUrl, clientId, clientSecret, secret };
}

export async function getDatabaseUrl(): Promise<string> {
  return (await pick('DATABASE_URL', { required: true, label: 'Database URL' }))!;
}

export async function getShippoToken(): Promise<string> {
  return (await pick('SHIPPO_TOKEN', { required: true, label: 'Shippo API token' }))!;
}

export async function getShippoWebhookSecret(): Promise<string | undefined> {
  // Optional - used for webhook signature verification
  return pick('SHIPPO_WEBHOOK_SECRET');
}

// === SYNC VERSIONS (FALLBACK - Use only for module-level initialization) ===

export function getStripeSecretKeySync(): string {
  return pickSync('STRIPE_SECRET_KEY', { required: true, label: 'Stripe secret key' })!;
}

export function getDatabaseUrlSync(): string {
  return pickSync('DATABASE_URL', { required: true, label: 'Database URL' })!;
}

export function getAuth0ManagementCredentialsSync(): {
  domain: string;
  clientId: string;
  clientSecret: string;
} {
  const domain = pickSync('AUTH0_DOMAIN', { required: true, label: 'Auth0 domain' })!;
  const clientId = pickSync('AUTH0_MANAGEMENT_CLIENT_ID', {
    required: true,
    label: 'Auth0 management client id',
  })!;
  const clientSecret = pickSync('AUTH0_MANAGEMENT_CLIENT_SECRET', {
    required: true,
    label: 'Auth0 management client secret',
  })!;

  return { domain, clientId, clientSecret };
}

export function getShippoTokenSync(): string {
  return pickSync('SHIPPO_TOKEN', { required: true, label: 'Shippo API token' })!;
}
