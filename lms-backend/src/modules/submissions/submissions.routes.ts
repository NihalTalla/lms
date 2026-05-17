import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { submitLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validate';

import { submissionsController } from './submissions.controller';

export const submissionsRouter = Router();

const idParams = z.object({
  id: z.string().uuid()
});

const createSchema = z.object({
  problemId: z.string().uuid(),
  language: z.enum(['python', 'c', 'cpp', 'java']),
  code: z.string().min(1).max(65_536),
  contestId: z.string().uuid().optional()
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  problemId: z.string().uuid().optional(),
  contestId: z.string().uuid().optional()
});

const gradeSchema = z.object({
  verdict: z.enum([
    'accepted',
    'wrong_answer',
    'time_limit_exceeded',
    'memory_limit_exceeded',
    'runtime_error',
    'compilation_error'
  ]),
  score: z.coerce.number().min(0).optional(),
  feedback: z.string().max(10_000).optional()
});

submissionsRouter.post(
  '/',
  authenticate,
  only('student', 'faculty', 'trainer'),
  submitLimiter,
  validate(createSchema),
  submissionsController.create
);

submissionsRouter.get('/', authenticate, validate({ query: listQuery }), submissionsController.list);

submissionsRouter.get('/recover', authenticate, submissionsController.recover);

submissionsRouter.get(
  '/grading-queue',
  authenticate,
  only('faculty', 'admin'),
  submissionsController.gradingQueue
);

submissionsRouter.get('/:id', authenticate, validate({ params: idParams }), submissionsController.getById);

submissionsRouter.patch(
  '/:id/grade',
  authenticate,
  only('faculty', 'admin'),
  validate({ params: idParams, body: gradeSchema }),
  submissionsController.grade
);
