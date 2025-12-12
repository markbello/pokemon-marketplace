import { PrismaClient } from '@prisma/client';
import { detectRuntimeEnvironment, getDatabaseUrl } from '@/lib/env';

const globalForPrisma = globalThis as unknown as {
  prismaByEnv: Record<'prod' | 'staging', PrismaClient | undefined> | undefined;
};

const prismaByEnv = globalForPrisma.prismaByEnv ?? { prod: undefined, staging: undefined };

export function getPrisma(hostnameOverride?: string): PrismaClient {
  const { env } = detectRuntimeEnvironment(hostnameOverride);

  if (!prismaByEnv[env]) {
    prismaByEnv[env] = new PrismaClient({
      datasources: {
        db: {
          url: getDatabaseUrl(hostnameOverride),
        },
      },
    });
  }

  return prismaByEnv[env]!;
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaByEnv = prismaByEnv;
}
