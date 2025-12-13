import { defineConfig } from 'prisma/config';
import { getDatabaseUrlSync } from './src/lib/env';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: getDatabaseUrlSync(),
  },
});
