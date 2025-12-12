import { URL } from 'url';

export type AppEnvironment = 'production' | 'staging' | 'preview' | 'local';

const PROD_DOMAIN = 'kado.io';
const STAGING_DOMAIN = 'staging.kado.io';

type EnvPickOptions = { required?: boolean; label?: string };

const optionalString = (value: string | undefined | null) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

function pickForEnv(
  base: string,
  env: AppEnvironment,
  options?: EnvPickOptions,
): string | undefined {
  const candidates: Array<string | undefined> = [];

  if (env === 'production') {
    candidates.push(optionalString(process.env[`${base}_PROD`]));
  } else if (env === 'staging' || env === 'preview' || env === 'local') {
    candidates.push(optionalString(process.env[`${base}_STAGING`]));
  } else {
    candidates.push(undefined);
  }

  const value = candidates.find(Boolean);

  if (!value && options?.required) {
    const label = options.label || base;
    throw new Error(`Missing environment variable for ${label} (${env})`);
  }

  return value;
}

export function detectAppEnvironment(): {
  env: AppEnvironment;
  hostname?: string;
  isProduction: boolean;
  isStaging: boolean;
  isPreview: boolean;
  isLocal: boolean;
} {
  const explicitBase =
    optionalString(process.env.APP_BASE_URL) ?? optionalString(process.env.NEXT_PUBLIC_APP_URL);
  const vercelUrl = optionalString(process.env.VERCEL_URL);

  const hostname = (() => {
    if (explicitBase) return new URL(explicitBase).hostname;
    if (vercelUrl) return new URL(`https://${vercelUrl}`).hostname;
    return undefined;
  })();

  let env: AppEnvironment = 'local';

  if (hostname === PROD_DOMAIN) {
    env = 'production';
  } else if (hostname === STAGING_DOMAIN) {
    env = 'staging';
  } else if (hostname?.endsWith('.vercel.app')) {
    env = 'preview';
  } else if (process.env.NODE_ENV === 'production') {
    // Fallback: production runtime but no custom domain; treat as preview
    env = 'preview';
  }

  return {
    env,
    hostname,
    isProduction: env === 'production',
    isStaging: env === 'staging',
    isPreview: env === 'preview',
    isLocal: env === 'local',
  };
}

export function getStripeSecrets(appEnv = detectAppEnvironment()) {
  const secretKey = pickForEnv('STRIPE_SECRET_KEY', appEnv.env, {
    required: true,
    label: 'Stripe secret key',
  })!;

  const webhookSecret = pickForEnv('STRIPE_WEBHOOK_SECRET', appEnv.env);

  return { secretKey, webhookSecret };
}

export function getAuth0Config(appEnv = detectAppEnvironment()) {
  const domain = pickForEnv('AUTH0_DOMAIN', appEnv.env, { label: 'Auth0 domain', required: true })!;
  const managementClientId =
    pickForEnv('AUTH0_MANAGEMENT_CLIENT_ID', appEnv.env) ??
    pickForEnv('AUTH0_CLIENT_ID', appEnv.env);
  const managementClientSecret =
    pickForEnv('AUTH0_MANAGEMENT_CLIENT_SECRET', appEnv.env) ??
    pickForEnv('AUTH0_CLIENT_SECRET', appEnv.env);

  if (!managementClientId || !managementClientSecret) {
    throw new Error(`Missing Auth0 Management credentials for ${appEnv.env}`);
  }

  return {
    domain,
    managementClientId,
    managementClientSecret,
  };
}

export function getDatabaseUrl(appEnv = detectAppEnvironment()): string {
  const url = pickForEnv('DATABASE_URL', appEnv.env);

  if (!url) {
    throw new Error(`Missing DATABASE_URL for ${appEnv.env}`);
  }

  return url;
}
