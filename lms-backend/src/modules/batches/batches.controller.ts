import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import {
  addCourseToBatch,
  createBatch,
  deleteBatch,
  enrollUser,
  getBatchById,
  listBatches,
  listBatchCourses,
  listBatchStudents,
  unenrollUser,
  updateBatch
} from './batches.service';

export const batchesController = {
  list: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const items = await listBatches({ id: req.user.id, role: req.user.role });
    return res.status(200).json({ data: items });
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.body as {
      name: string;
      institutionId?: string;
      startDate?: Date | null;
      endDate?: Date | null;
    };

    const batch = await createBatch(body);
    return res.status(201).json({ data: batch });
  }),

  getById: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const batch = await getBatchById(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(200).json({ data: batch });
  }),

  update: asyncHandler(async (req, res) => {
    const body = req.body as {
      name?: string;
      institutionId?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
    };

    const batch = await updateBatch(req.params.id, body);
    return res.status(200).json({ data: batch });
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await deleteBatch(req.params.id);
    return res.status(200).json({ data: result });
  }),

  students: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const items = await listBatchStudents(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(200).json({ data: items });
  }),

  enroll: asyncHandler(async (req, res) => {
    const body = req.body as { userId: string; role: string };

    const enrollment = await enrollUser(req.params.id, {
      userId: body.userId,
      role: body.role as never
    });

    return res.status(201).json({ data: enrollment });
  }),

  unenroll: asyncHandler(async (req, res) => {
    const result = await unenrollUser(req.params.id, req.params.userId);
    return res.status(200).json({ data: result });
  }),

  courses: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const items = await listBatchCourses(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(200).json({ data: items });
  }),

  addCourse: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as { courseId: string };
    const result = await addCourseToBatch(req.params.id, { id: req.user.id, role: req.user.role }, body.courseId);

    return res.status(201).json({ data: result });
  })
};
