import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';

import { coursesController } from './courses.controller';
import { courseModulesController } from './modules.controller';

export const coursesRouter = Router();

const courseIdParams = z.object({
  id: z.string().uuid()
});

const courseIdWithModuleParams = z.object({
  courseId: z.string().uuid(),
  id: z.string().uuid()
});

const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional()
});

const updateCourseSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).nullable().optional(),
    thumbnailUrl: z.string().url().nullable().optional(),
    isPublished: z.boolean().optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

const createModuleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1).nullable().optional(),
  duration: z.coerce.number().int().min(1).nullable().optional(),
  isPublished: z.boolean().optional(),
  order: z.coerce.number().int().min(1).optional()
});

const updateModuleSchema = z
  .object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).nullable().optional(),
    duration: z.coerce.number().int().min(1).nullable().optional(),
    isPublished: z.boolean().optional(),
    order: z.coerce.number().int().min(1).optional(),
    videoUrl: z.string().min(1).nullable().optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

const presignVideoSchema = z.object({
  contentType: z.enum(['video/mp4', 'video/webm'])
});

coursesRouter.get('/', authenticate, coursesController.list);

coursesRouter.post('/', authenticate, only('admin', 'faculty'), validate(createCourseSchema), coursesController.create);

coursesRouter.get('/:id', authenticate, validate({ params: courseIdParams }), coursesController.getById);

coursesRouter.patch(
  '/:id',
  authenticate,
  only('admin', 'faculty'),
  validate({ params: courseIdParams, body: updateCourseSchema }),
  coursesController.update
);

coursesRouter.delete('/:id', authenticate, only('admin'), validate({ params: courseIdParams }), coursesController.delete);

// Course modules
coursesRouter.get(
  '/:courseId/modules',
  authenticate,
  validate({ params: z.object({ courseId: z.string().uuid() }) }),
  courseModulesController.list
);

coursesRouter.post(
  '/:courseId/modules',
  authenticate,
  only('admin', 'faculty'),
  validate({ params: z.object({ courseId: z.string().uuid() }), body: createModuleSchema }),
  courseModulesController.create
);

coursesRouter.get(
  '/:courseId/modules/:id',
  authenticate,
  validate({ params: courseIdWithModuleParams }),
  courseModulesController.get
);

coursesRouter.patch(
  '/:courseId/modules/:id',
  authenticate,
  only('admin', 'faculty'),
  validate({ params: courseIdWithModuleParams, body: updateModuleSchema }),
  courseModulesController.update
);

coursesRouter.delete(
  '/:courseId/modules/:id',
  authenticate,
  only('admin', 'faculty'),
  validate({ params: courseIdWithModuleParams }),
  courseModulesController.delete
);

coursesRouter.post(
  '/:courseId/modules/:id/video-upload-url',
  authenticate,
  only('admin', 'faculty'),
  validate({ params: courseIdWithModuleParams, body: presignVideoSchema }),
  courseModulesController.presignVideo
);
