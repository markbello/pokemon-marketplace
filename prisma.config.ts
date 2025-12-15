import { defineConfig } from 'prisma/config';

// With dual Vercel projects (PM-67), each deployment has its own DATABASE_URL
// No suffix logic needed anymore
function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
  return dbUrl;
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
