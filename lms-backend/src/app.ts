import 'dotenv/config';

import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { prisma } from '@/config/db';
import { redis } from '@/config/redis';
import { sqs } from '@/config/sqs';
import { generalLimiter } from '@/middleware/rateLimiter';
import { errorHandler } from '@/middleware/errorHandler';
import { asyncHandler } from '@/utils/asyncHandler';
import { notFound } from '@/utils/apiError';

import { authRouter } from '@/modules/auth';
import { usersRouter } from '@/modules/users';
import { coursesRouter } from '@/modules/courses';
import { batchesRouter } from '@/modules/batches';
import { problemsRouter } from '@/modules/problems';
import { storageRouter } from '@/modules/storage';
import { submissionsRouter } from '@/modules/submissions';
import { contestsRouter } from '@/modules/contests';
import { testsRouter } from '@/modules/tests';
import { messagesRouter } from '@/modules/messages';
import { analyticsRouter } from '@/modules/analytics';
import { institutionsRouter } from '@/modules/institutions';
import { billingRouter } from '@/modules/billing';
import attendanceRouter from '@/modules/attendance/attendance.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const requestId = typeof incoming === 'string' && incoming.trim().length > 0 ? incoming : randomUUID();

        res.setHeader('x-request-id', requestId);
        return requestId;
      },
      customProps: (req) => ({
        requestId: req.id
      })
    })
  );

  app.use((req, res, next) => {
    if (!res.getHeader('x-request-id')) {
      const incoming = req.headers['x-request-id'];
      const requestId = typeof incoming === 'string' && incoming.trim().length > 0 ? incoming : randomUUID();
      res.setHeader('x-request-id', requestId);
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: true,
      hsts: { maxAge: 31536000 }
    })
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);

        if (env.ALLOWED_ORIGINS.includes(origin)) {
          return cb(null, true);
        }

        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
      exposedHeaders: ['x-request-id']
    })
  );

  app.get(
    '/health',
    asyncHandler(async (_req, res) => {
      let db: 'ok' | 'error' = 'ok';
      let redisStatus: 'ok' | 'error' = 'ok';
      let sqsStatus: 'ok' | 'error' = 'ok';

      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        db = 'error';
        logger.error({ err }, 'healthcheck db failed');
      }

      try {
        await redis.ping();
      } catch (err) {
        redisStatus = 'error';
        logger.error({ err }, 'healthcheck redis failed');
      }

      try {
        const { GetQueueAttributesCommand } = await import('@aws-sdk/client-sqs');
        await sqs.send(
          new GetQueueAttributesCommand({
            QueueUrl: env.SQS_SUBMISSIONS_QUEUE_URL,
            AttributeNames: ['QueueArn']
          })
        );
      } catch (err) {
        sqsStatus = 'error';
        logger.error({ err }, 'healthcheck sqs failed');
      }

      return res.status(200).json({
        status: 'ok',
        db,
        redis: redisStatus,
        sqs: sqsStatus,
        uptime: process.uptime()
      });
    })
  );

  // Rate limit all API routes.
  app.use('/api', generalLimiter);

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/courses', coursesRouter);
  app.use('/api/batches', batchesRouter);
  app.use('/api/problems', problemsRouter);
  app.use('/api/storage', storageRouter);
  app.use('/api/submissions', submissionsRouter);
  app.use('/api/contests', contestsRouter);
  app.use('/api/tests', testsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/institutions', institutionsRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/attendance', attendanceRouter);

  app.use((_req, _res) => {
    throw notFound();
  });

  app.use(errorHandler);

  return app;
}
