import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { logger } from '@/config/logger';
import { ApiError } from '@/utils/apiError';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringProp(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

function isPrismaKnownRequestError(err: unknown): err is { code: string } {
  if (!isRecord(err)) return false;
  return getStringProp(err, 'name') === 'PrismaClientKnownRequestError' && typeof err.code === 'string';
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const requestId = typeof res.getHeader('x-request-id') === 'string' ? res.getHeader('x-request-id') : undefined;

  const withRequestId = (payload: Record<string, unknown>) =>
    requestId ? { ...payload, requestId } : payload;

  if (err instanceof ZodError) {
    return res.status(422).json({
      ...withRequestId({
        error: 'Validation failed',
        details: err.issues
      })
    });
  }

  if (isPrismaKnownRequestError(err)) {
    if (err.code === 'P2002') {
      return res.status(409).json(withRequestId({ error: 'Already exists' }));
    }

    if (err.code === 'P2025') {
      return res.status(404).json(withRequestId({ error: 'Not found' }));
    }
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(withRequestId({ error: err.message }));
  }

  // JWT errors can bubble up from refresh endpoints.
  if (err instanceof Error && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
    return res.status(401).json(withRequestId({ error: 'Invalid token' }));
  }

  logger.error({ err }, 'unhandled error');
  return res.status(500).json(withRequestId({ error: 'Internal server error' }));
};
