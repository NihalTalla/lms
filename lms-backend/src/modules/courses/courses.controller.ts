import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import { createCourse, deleteCourse, getCourseById, listCourses, updateCourse } from './courses.service';

export const coursesController = {
  list: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const items = await listCourses(req.user.role);
    return res.status(200).json({ data: items });
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.body as {
      title: string;
      description?: string | null;
      thumbnailUrl?: string | null;
    };

    const course = await createCourse(body);
    return res.status(201).json({ data: course });
  }),

  getById: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const course = await getCourseById(req.params.id, req.user.role);
    return res.status(200).json({ data: course });
  }),

  update: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      title?: string;
      description?: string | null;
      thumbnailUrl?: string | null;
      isPublished?: boolean;
    };

    const course = await updateCourse(req.params.id, req.user.role, body);
    return res.status(200).json({ data: course });
  }),

  delete: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const result = await deleteCourse(req.params.id, req.user.role);
    return res.status(200).json({ data: result });
  })
};
