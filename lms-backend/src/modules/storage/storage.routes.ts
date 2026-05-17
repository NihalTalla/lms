import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';

import { storageController } from './storage.controller';

export const storageRouter = Router();

const presignSchema = z.object({
  key: z.string().min(1).optional(),
  prefix: z.string().min(1).optional(),
  filename: z.string().min(1).optional(),
  contentType: z.enum(['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'])
});

storageRouter.post(
  '/presign',
  authenticate,
  only('student', 'faculty', 'trainer', 'admin'),
  validate(presignSchema),
  storageController.presign
);
