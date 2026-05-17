import type { RequestHandler } from 'express';

import { env } from '@/config/env';
import { redis } from '@/config/redis';
import { logger } from '@/config/logger';

type KeyGenerator = (req: Parameters<RequestHandler>[0]) => string;

interface LimiterOptions {
  keyPrefix: string;
  windowMs: number;
  max: number;
  keyGenerator: KeyGenerator;
}

function limiter(options: LimiterOptions): RequestHandler {
  return async (req, res, next) => {
    const identifier = options.keyGenerator(req);
    const endpoint = `${req.method}:${req.baseUrl}${req.path}`;
    const key = `${options.keyPrefix}:${identifier}:${endpoint}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, options.windowMs);
      }

      if (count > options.max) {
        return res.status(429).json({ error: 'Too many requests' });
      }

      return next();
    } catch (err) {
      // Fail open if Redis is down — availability > rate limiting.
      logger.error({ err }, 'rate limiter redis error (fail-open)');
      return next();
    }
  };
}

function getIp(req: Parameters<RequestHandler>[0]) {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

export const generalLimiter = limiter({
  keyPrefix: 'rate:ip',
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  keyGenerator: (req) => getIp(req)
});

export const authLimiter = limiter({
  keyPrefix: 'rate:auth',
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 10,
  keyGenerator: (req) => getIp(req)
});

export const submitLimiter = limiter({
  keyPrefix: 'rate:submit',
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 5,
  keyGenerator: (req) => req.user?.id ?? getIp(req)
});

export const testLimiter = limiter({
  keyPrefix: 'rate:test',
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 3,
  keyGenerator: (req) => req.user?.id ?? getIp(req)
});
