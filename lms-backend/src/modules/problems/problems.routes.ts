import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';

import { problemsController } from './problems.controller';
import { testCasesController } from './testCases.controller';

export const problemsRouter = Router();

const idParams = z.object({
  id: z.string().uuid()
});

const testCaseParams = z.object({
  id: z.string().uuid(),
  caseId: z.string().uuid()
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  tags: z.string().min(1).optional(),
  search: z.string().min(1).optional()
});

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string().min(1)).default([]),
  timeLimit: z.coerce.number().int().min(100).max(15000).optional(),
  memoryLimit: z.coerce.number().int().min(16).max(2048).optional(),
  isPublished: z.boolean().optional()
});

const updateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    tags: z.array(z.string().min(1)).optional(),
    timeLimit: z.coerce.number().int().min(100).max(15000).optional(),
    memoryLimit: z.coerce.number().int().min(16).max(2048).optional(),
    isPublished: z.boolean().optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

const createTestCaseSchema = z.object({
  input: z.string(),
  expected: z.string(),
  isSample: z.boolean().optional(),
  order: z.coerce.number().int().min(1).optional()
});

const updateTestCaseSchema = z
  .object({
    input: z.string().optional(),
    expected: z.string().optional(),
    isSample: z.boolean().optional(),
    order: z.coerce.number().int().min(1).optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

problemsRouter.get('/', authenticate, validate({ query: listQuery }), problemsController.list);

problemsRouter.post('/', authenticate, only('admin', 'faculty', 'trainer'), validate(createSchema), problemsController.create);

problemsRouter.get('/:id', authenticate, validate({ params: idParams }), problemsController.getById);

problemsRouter.patch(
  '/:id',
  authenticate,
  only('admin', 'faculty', 'trainer'),
  validate({ params: idParams, body: updateSchema }),
  problemsController.update
);

problemsRouter.delete('/:id', authenticate, only('admin'), validate({ params: idParams }), problemsController.delete);

// Test cases (privileged)
problemsRouter.get(
  '/:id/test-cases',
  authenticate,
  only('admin', 'faculty', 'trainer'),
  validate({ params: idParams }),
  testCasesController.list
);

problemsRouter.post(
  '/:id/test-cases',
  authenticate,
  only('admin', 'faculty', 'trainer'),
  validate({ params: idParams, body: createTestCaseSchema }),
  testCasesController.create
);

problemsRouter.patch(
  '/:id/test-cases/:caseId',
  authenticate,
  only('admin', 'faculty', 'trainer'),
  validate({ params: testCaseParams, body: updateTestCaseSchema }),
  testCasesController.update
);

problemsRouter.delete(
  '/:id/test-cases/:caseId',
  authenticate,
  only('admin'),
  validate({ params: testCaseParams }),
  testCasesController.delete
);
