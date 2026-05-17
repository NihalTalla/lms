import { Router } from 'express';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';

import { analyticsController } from './analytics.controller';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', authenticate, only('admin'), analyticsController.overview);
analyticsRouter.get('/submissions', authenticate, only('admin'), analyticsController.submissions);
analyticsRouter.get('/users', authenticate, only('admin'), analyticsController.users);
analyticsRouter.get('/contests', authenticate, only('admin'), analyticsController.overview);
