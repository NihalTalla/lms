import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import {
  createModule,
  deleteModule,
  getModule,
  listModules,
  presignModuleVideoUpload,
  updateModule
} from './modules.service';

export const courseModulesController = {
  list: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const items = await listModules(req.params.courseId, req.user.role);
    return res.status(200).json({ data: items });
  }),

  create: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      title: string;
      content?: string | null;
      duration?: number | null;
      isPublished?: boolean;
      order?: number;
    };

    const module = await createModule(req.params.courseId, req.user.role, body);
    return res.status(201).json({ data: module });
  }),

  get: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const module = await getModule(req.params.courseId, req.params.id, req.user.role);
    return res.status(200).json({ data: module });
  }),

  update: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      title?: string;
      order?: number;
      content?: string | null;
      duration?: number | null;
      isPublished?: boolean;
      videoUrl?: string | null;
    };

    const module = await updateModule(req.params.courseId, req.params.id, req.user.role, body);
    return res.status(200).json({ data: module });
  }),

  delete: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const result = await deleteModule(req.params.courseId, req.params.id, req.user.role);
    return res.status(200).json({ data: result });
  }),

  presignVideo: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as { contentType: string };
    const result = await presignModuleVideoUpload(
      req.params.courseId,
      req.params.id,
      req.user.role,
      body.contentType
    );

    return res.status(200).json({ data: result });
  })
};
