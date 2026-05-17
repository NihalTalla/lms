import 'dotenv/config';

import { env } from '@/config/env';
import { prisma } from '@/config/db';
import { redis } from '@/config/redis';
import { logger } from '@/config/logger';

import { startSubmissionsWorker } from '@/jobs/submissions.worker';

async function main() {
  await prisma.$connect();
  await redis.connect();

  const worker = startSubmissionsWorker();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'worker shutdown started');

    await worker.close();

    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    logger.info('worker shutdown complete');
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  logger.info({ env: env.NODE_ENV }, 'worker started');
}

main().catch((err: unknown) => {
  logger.error({ err }, 'fatal worker startup error');
  process.exit(1);
});
