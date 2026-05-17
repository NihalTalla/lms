import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { roleEnum } from '@/config/env';

import { batchesController } from './batches.controller';

export const batchesRouter = Router();

const idParams = z.object({
  id: z.string().uuid()
});

const enrollParams = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid()
});

const createSchema = z.object({
  name: z.string().min(1),
  institutionId: z.string().uuid().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional()
});

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    institutionId: z.string().uuid().nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

const enrollSchema = z.object({
  userId: z.string().uuid(),
  role: roleEnum
});

const addCourseSchema = z.object({
  courseId: z.string().uuid()
});

batchesRouter.get('/', authenticate, only('admin', 'faculty', 'trainer'), batchesController.list);

batchesRouter.post('/', authenticate, only('admin'), validate(createSchema), batchesController.create);

batchesRouter.get('/:id', authenticate, validate({ params: idParams }), batchesController.getById);

batchesRouter.patch(
  '/:id',
  authenticate,
  only('admin'),
  validate({ params: idParams, body: updateSchema }),
  batchesController.update
);

batchesRouter.delete('/:id', authenticate, only('admin'), validate({ params: idParams }), batchesController.delete);

batchesRouter.get(
  '/:id/students',
  authenticate,
  only('admin', 'faculty', 'trainer'),
  validate({ params: idParams }),
  batchesController.students
);

batchesRouter.post(
  '/:id/enroll',
  authenticate,
  only('admin'),
  validate({ params: idParams, body: enrollSchema }),
  batchesController.enroll
);

batchesRouter.delete(
  '/:id/enroll/:userId',
  authenticate,
  only('admin'),
  validate({ params: enrollParams }),
  batchesController.unenroll
);

batchesRouter.get('/:id/courses', authenticate, validate({ params: idParams }), batchesController.courses);

batchesRouter.post(
  '/:id/courses',
  authenticate,
  only('admin', 'faculty'),
  validate({ params: idParams, body: addCourseSchema }),
  batchesController.addCourse
);
