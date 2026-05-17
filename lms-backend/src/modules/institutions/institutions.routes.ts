import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';

import { institutionsController } from './institutions.controller';

export const institutionsRouter = Router();

const idParams = z.object({ id: z.string().uuid() });
const bodySchema = z.object({ name: z.string().min(1) });

institutionsRouter.get('/', authenticate, only('admin'), institutionsController.list);
institutionsRouter.post('/', authenticate, only('admin'), validate(bodySchema), institutionsController.create);
institutionsRouter.get('/:id', authenticate, only('admin'), validate({ params: idParams }), institutionsController.get);
institutionsRouter.patch('/:id', authenticate, only('admin'), validate({ params: idParams, body: bodySchema }), institutionsController.update);
institutionsRouter.delete('/:id', authenticate, only('admin'), validate({ params: idParams }), institutionsController.delete);
