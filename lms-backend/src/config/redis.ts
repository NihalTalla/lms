import Redis from 'ioredis';

import { env } from './env';
import { logger } from './logger';

function createRedisClient() {
  return new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });
}

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

redis.on('error', (err) => {
  logger.error({ err }, 'redis error');
});

redis.on('connect', () => {
  logger.info('redis connected');
});

redis.on('reconnecting', () => {
  logger.warn('redis reconnecting');
});
