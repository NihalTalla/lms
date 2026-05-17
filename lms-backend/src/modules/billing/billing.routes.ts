import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';

import { billingController } from './billing.controller';

export const billingRouter = Router();

const idParams = z.object({ id: z.string().uuid() });
const querySchema = z.object({ institutionId: z.string().uuid().optional() });
const createSchema = z.object({
  institutionId: z.string().uuid(),
  plan: z.string().min(1),
  status: z.string().min(1),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date()
});
const updateSchema = z
  .object({
    plan: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    startsAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

billingRouter.get('/subscription', authenticate, only('admin'), validate({ query: querySchema }), billingController.active);
billingRouter.post('/subscription', authenticate, only('admin'), validate(createSchema), billingController.create);
billingRouter.patch('/subscription/:id', authenticate, only('admin'), validate({ params: idParams, body: updateSchema }), billingController.update);
