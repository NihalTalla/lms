import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';

import { contestsController } from './contests.controller';

export const contestsRouter = Router();

const idParams = z.object({
  id: z.string().uuid()
});

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).nullable().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  isPublic: z.boolean().optional(),
  batchId: z.string().uuid().nullable().optional(),
  problems: z
    .array(
      z.object({
        problemId: z.string().uuid(),
        order: z.coerce.number().int().min(1),
        points: z.coerce.number().int().min(0).optional()
      })
    )
    .min(1)
});

contestsRouter.get('/', authenticate, contestsController.list);

const updateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).nullable().optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    isPublic: z.boolean().optional(),
    batchId: z.string().uuid().nullable().optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

const problemIdParams = z.object({
  id: z.string().uuid(),
  problemId: z.string().uuid()
});

const addProblemSchema = z.object({
  problemId: z.string().uuid(),
  points: z.coerce.number().int().min(0).default(100),
  order: z.coerce.number().int().min(1)
});

const submitSchema = z.object({
  problemId: z.string().uuid(),
  language: z.enum(['python', 'c', 'cpp', 'java']),
  code: z.string().min(1).max(65_536)
});

contestsRouter.post('/', authenticate, only('admin', 'trainer'), validate(createSchema), contestsController.create);

contestsRouter.get('/:id', authenticate, validate({ params: idParams }), contestsController.getById);

contestsRouter.patch(
  '/:id',
  authenticate,
  only('admin', 'trainer'),
  validate({ params: idParams, body: updateSchema }),
  contestsController.update
);

contestsRouter.post('/:id/join', authenticate, only('student'), validate({ params: idParams }), contestsController.join);

contestsRouter.get(
  '/:id/leaderboard',
  authenticate,
  validate({ params: idParams }),
  contestsController.leaderboard
);

contestsRouter.post(
  '/:id/problems',
  authenticate,
  only('admin', 'trainer'),
  validate({ params: idParams, body: addProblemSchema }),
  contestsController.addProblem
);

contestsRouter.delete(
  '/:id/problems/:problemId',
  authenticate,
  only('admin', 'trainer'),
  validate({ params: problemIdParams }),
  contestsController.removeProblem
);

contestsRouter.post(
  '/:id/submissions',
  authenticate,
  only('student'),
  validate({ params: idParams, body: submitSchema }),
  contestsController.submit
);

contestsRouter.get(
  '/:id/my-submissions',
  authenticate,
  only('student'),
  validate({ params: idParams }),
  contestsController.mySubmissions
);
