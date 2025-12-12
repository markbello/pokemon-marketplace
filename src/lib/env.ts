export type RuntimeEnvironment = 'prod' | 'staging';

const PROD_HOSTNAMES = new Set(['kado.io']);
const STAGING_HOSTNAMES = new Set(['staging.kado.io']);

function normalizeHostname(hostname: string | undefined): string | undefined {
  if (!hostname) return undefined;
  return hostname.toLowerCase().replace(/^www\./, '');
}

function getDeploymentHostname(): string | undefined {
  const vercelUrl = process.env.VERCEL_URL;
  if (!vercelUrl) return undefined;
  // VERCEL_URL is a hostname (no protocol)
  return normalizeHostname(vercelUrl);
}

export function detectRuntimeEnvironment(): { env: RuntimeEnvironment; hostname?: string } {
  const hostname = getDeploymentHostname();

  // Preview deployments should behave like staging (test Stripe, staging Auth0, staging DB)
  if (hostname?.endsWith('.vercel.app')) {
    return { env: 'staging', hostname };
  }

  if (hostname && STAGING_HOSTNAMES.has(hostname)) {
    return { env: 'staging', hostname };
  }

  if (hostname && PROD_HOSTNAMES.has(hostname)) {
    return { env: 'prod', hostname };
  }

  // Local dev or unknown host: treat as staging for safety.
  return { env: 'staging', hostname };
}

type EnvPickOptions = {
  required?: boolean;
  label?: string;
};

function pick(base: string, options?: EnvPickOptions): string | undefined {
  const { env } = detectRuntimeEnvironment();
  const suffix = env === 'prod' ? 'PROD' : 'STAGING';

  const value = process.env[`${base}_${suffix}`];

  if (!value && options?.required) {
    throw new Error(
      `Missing env var: ${base}_${suffix}${options.label ? ` (${options.label})` : ''}`,
    );
  }

  return value;
}

export function getStripeSecretKey() {
  return pick('STRIPE_SECRET_KEY', { required: true, label: 'Stripe secret key' })!;
}

export function getStripeWebhookSecret() {
  // optional in dev (signature verification skipped)
  return pick('STRIPE_WEBHOOK_SECRET');
}

export function getAuth0ManagementCredentials() {
  const domain = pick('AUTH0_DOMAIN', { required: true, label: 'Auth0 domain' })!;
  const clientId = pick('AUTH0_MANAGEMENT_CLIENT_ID', {
    required: true,
    label: 'Auth0 management client id',
  })!;
  const clientSecret = pick('AUTH0_MANAGEMENT_CLIENT_SECRET', {
    required: true,
    label: 'Auth0 management client secret',
  })!;

  return { domain, clientId, clientSecret };
}

export function getDatabaseUrl() {
  return pick('DATABASE_URL', { required: true, label: 'Database URL' })!;
}
