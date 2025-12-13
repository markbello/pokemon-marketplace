import { defineConfig } from 'prisma/config';

// For Prisma CLI commands, use environment-specific variables
function getDatabaseUrl(): string {
  const vercelUrl = process.env.VERCEL_URL;
  const isProd = vercelUrl?.includes('kado.io') || vercelUrl === 'kado.io';
  const envSuffix = isProd ? 'PROD' : 'STAGING';

  const dbUrl = process.env[`DATABASE_URL_${envSuffix}`];
  if (dbUrl) {
    return dbUrl;
  }

  throw new Error(`Missing DATABASE_URL_${envSuffix}`);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: getDatabaseUrl(),
  },
});
