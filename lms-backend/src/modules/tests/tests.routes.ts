import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { testLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validate';

import { testsController } from './tests.controller';

export const testsRouter = Router();

const idParams = z.object({ id: z.string().uuid() });

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1)
});

const questionSchema = z.object({
  text: z.string().min(1),
  options: z.array(optionSchema).min(2),
  answer: z.string().min(1),
  points: z.coerce.number().int().min(1).default(1),
  order: z.coerce.number().int().min(1)
});

const createSchema = z.object({
  batchId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1).nullable().optional(),
  startTime: z.coerce.date().nullable().optional(),
  endTime: z.coerce.date().nullable().optional(),
  durationSeconds: z.coerce.number().int().min(60).max(24 * 60 * 60).nullable().optional(),
  questions: z.array(questionSchema).min(1)
});

const updateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).nullable().optional(),
    startTime: z.coerce.date().nullable().optional(),
    endTime: z.coerce.date().nullable().optional(),
    durationSeconds: z.coerce.number().int().min(60).max(24 * 60 * 60).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const attemptSchema = z.object({
  answers: z.record(z.string().uuid(), z.string().min(1))
});

testsRouter.get('/', authenticate, only('student', 'faculty', 'trainer', 'admin'), testsController.list);
testsRouter.post('/', authenticate, only('admin', 'trainer'), validate(createSchema), testsController.create);
testsRouter.get('/:id', authenticate, only('student', 'faculty', 'trainer', 'admin'), validate({ params: idParams }), testsController.getById);
testsRouter.patch('/:id', authenticate, only('admin', 'trainer'), validate({ params: idParams, body: updateSchema }), testsController.update);
testsRouter.post('/:id/questions', authenticate, only('admin', 'trainer'), validate({ params: idParams, body: questionSchema }), testsController.addQuestion);
testsRouter.post('/:id/attempt/start', authenticate, only('student'), testLimiter, validate({ params: idParams }), testsController.startAttempt);
testsRouter.get('/:id/attempt/active', authenticate, only('student'), validate({ params: idParams }), testsController.activeAttempt);
testsRouter.post('/:id/attempt', authenticate, only('student'), testLimiter, validate({ params: idParams, body: attemptSchema }), testsController.attempt);
testsRouter.get('/:id/results', authenticate, only('admin', 'trainer', 'faculty'), validate({ params: idParams }), testsController.results);
testsRouter.get('/:id/monitoring', authenticate, only('trainer'), validate({ params: idParams }), testsController.monitoring);
testsRouter.get('/:id/my-result', authenticate, only('student'), validate({ params: idParams }), testsController.myResult);
