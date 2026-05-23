import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';

const router = Router();

// Public (authenticated) listing - supports optional batchId query
router.get('/', authenticate, attendanceController.list);

// Create/close restricted to admins/faculty
router.post('/', authenticate, only('admin', 'faculty'), attendanceController.create);
router.patch('/:id/close', authenticate, only('admin', 'faculty'), attendanceController.close);

// Mark attendance as current user
router.post('/:id/mark', authenticate, attendanceController.mark);

export default router;
