import { createApp } from './app';

import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { prisma, connectPrismaWithRetry } from '@/config/db';
import { redis } from '@/config/redis';

async function main() {
  // Validate critical environment variables early
  logger.info(
    {
      required: [
        'DATABASE_URL',
        'JWT_SECRET',
        'SQS_SUBMISSIONS_QUEUE_URL',
        'COMPILER_SERVICE_URL'
      ]
    },
    'Starting LMS backend with env validation'
  );

  // Crash early if dependencies are unavailable (ECS will restart the task).
  try {
    await connectPrismaWithRetry(5, 1000);
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to database. Exiting.');
    process.exit(1);
  }

  try {
    await redis.connect();
    logger.info('Redis connected successfully');
  } catch (err) {
    logger.warn({ err }, 'Redis connection failed, continuing without cache');
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, nodeEnv: env.NODE_ENV },
      'lms-backend listening - submission pipeline ready'
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutdown started');

    server.close(() => {
      logger.info('http server closed');
    });

    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    logger.info('shutdown complete');
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

main().catch((err: unknown) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
