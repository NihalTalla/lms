import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';
import { roleEnum } from '@/config/env';

import { usersController } from './users.controller';

export const usersRouter = Router();

const idParamSchema = z.object({
  id: z.string().uuid()
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: roleEnum.optional(),
  search: z.string().min(1).optional()
});

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: roleEnum,
  institutionId: z.string().uuid().optional()
});

const updateSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    isActive: z.boolean().optional(),
    role: roleEnum.optional(),
    institutionId: z.string().uuid().nullable().optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

const avatarSchema = z.object({
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp'])
});

usersRouter.get('/', authenticate, only('admin'), validate({ query: listQuerySchema }), usersController.list);

usersRouter.post('/', authenticate, only('admin'), validate(createSchema), usersController.create);

usersRouter.get('/me', authenticate, usersController.me);
usersRouter.post('/me/avatar', authenticate, validate(avatarSchema), usersController.avatar);

usersRouter.get('/:id', authenticate, validate({ params: idParamSchema }), usersController.getById);

usersRouter.patch(
  '/:id',
  authenticate,
  validate({ params: idParamSchema, body: updateSchema }),
  usersController.update
);

const resetPasswordSchema = z.object({ password: z.string().min(8) });
const statusSchema = z.object({ isActive: z.boolean() });

usersRouter.post(
  '/:id/reset-password',
  authenticate,
  only('admin'),
  validate({ params: idParamSchema, body: resetPasswordSchema }),
  usersController.resetPassword
);

usersRouter.patch(
  '/:id/status',
  authenticate,
  only('admin'),
  validate({ params: idParamSchema, body: statusSchema }),
  usersController.updateStatus
);

usersRouter.delete('/:id', authenticate, only('admin'), validate({ params: idParamSchema }), usersController.softDelete);
