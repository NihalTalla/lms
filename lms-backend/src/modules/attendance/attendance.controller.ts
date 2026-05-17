import { asyncHandler } from '@/utils/asyncHandler';
import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import {
  listAttendanceSessions,
  createAttendanceSession,
  closeAttendanceSession,
  markAttendance
} from './attendance.service';

export const attendanceController = {
  list: asyncHandler(async (req, res) => {
    const batchId = req.query.batchId as string | undefined;
    const items = await listAttendanceSessions(batchId);
    return res.status(200).json({ data: items });
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.body as { courseId: string; courseTitle: string; batchId?: string };
    const session = await createAttendanceSession(body);
    return res.status(201).json({ data: session });
  }),

  close: asyncHandler(async (req, res) => {
    const id = req.params.id;
    const session = await closeAttendanceSession(id);
    return res.status(200).json({ data: session });
  }),

  mark: asyncHandler(async (req, res) => {
    if (!req.user) throw new Error('Unauthorized');
    const id = req.params.id;
    const mark = await markAttendance({ id: req.user.id, role: req.user.role }, id);
    return res.status(200).json({ data: mark });
  })
};
