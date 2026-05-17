import { PrismaClient } from '@prisma/client';

import { env } from './env';
import { logger } from './logger';

function createPrismaClient() {
  return new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    // Prisma will log to stdout in dev; pino-http covers request logs.
    log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error']
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// For debugging connection issues
export async function connectPrismaWithRetry(maxAttempts = 5, delayMs = 1000) {
  let lastError: unknown;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await prisma.$connect();
      logger.info('Prisma connected successfully');
      return true;
    } catch (err) {
      lastError = err;
      logger.warn(
        {
          attempt: i,
          maxAttempts,
          error: err instanceof Error ? err.message : String(err)
        },
        'Prisma connection attempt failed (P1000 errors indicate DB is unreachable)'
      );

      // Check for P1000 specifically
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('P1000')) {
        logger.error(
          {
            detail: 'P1000 error indicates connection timeout. Verify:',
            tips: [
              '1. DATABASE_URL is correct (postgresql://user:pass@host:5432/dbname)',
              '2. PostgreSQL service is running (docker-compose up -d for local)',
              '3. Network connectivity to DB host',
              '4. DB user/password are correct',
              '5. Use Neon: DATABASE_URL=postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require',
              '6. Use Supabase: DATABASE_URL provided in Supabase dashboard'
            ]
          },
          'P1000 Database Connection Error'
        );
      }

      if (i < maxAttempts) {
        const wait = delayMs * i; // exponential backoff
        logger.info({ waitMs: wait }, `Retrying in ${wait}ms...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  logger.error({ lastError }, `Failed to connect to Prisma after ${maxAttempts} attempts`);
  throw lastError;
}
