import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import {
  createUser,
  getUserById,
  listUsers,
  presignAvatarUpload,
  softDeleteUser,
  updateUser,
  updateUserFull,
  resetUserPassword,
  updateUserStatus
} from './users.service';

export const usersController = {
  list: asyncHandler(async (req, res) => {
    const q = req.query as unknown as {
      page: number;
      limit: number;
      role?: string;
      search?: string;
    };

    const result = await listUsers({
      page: q.page,
      limit: q.limit,
      role: q.role as never,
      search: q.search
    });

    return res.status(200).json({ data: result });
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.body as {
      email: string;
      password: string;
      name: string;
      role: string;
      institutionId?: string;
    };

    const user = await createUser({
      email: body.email,
      password: body.password,
      name: body.name,
      role: body.role as never,
      institutionId: body.institutionId
    });

    return res.status(201).json({ data: user });
  }),

  me: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const user = await getUserById({ id: req.user.id, role: req.user.role }, req.user.id);
    return res.status(200).json({ data: user });
  }),

  getById: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const user = await getUserById({ id: req.user.id, role: req.user.role }, req.params.id);
    return res.status(200).json({ data: user });
  }),

  update: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = req.body as {
      email?: string;
      name?: string;
      avatarUrl?: string | null;
      isActive?: boolean;
      role?: string;
      institutionId?: string | null;
    };

    // Use updateUserFull for richer admin updates
    const user = await updateUserFull({ id: req.user.id, role: req.user.role }, req.params.id, {
      email: body.email,
      name: body.name,
      avatarUrl: body.avatarUrl,
      isActive: body.isActive,
      role: body.role as any,
      institutionId: body.institutionId
    });
    return res.status(200).json({ data: user });
  }),

  softDelete: asyncHandler(async (req, res) => {
    const user = await softDeleteUser(req.params.id);
    return res.status(200).json({ data: user });
  }),

  avatar: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as { contentType: string };
    const result = await presignAvatarUpload(req.user.id, body.contentType);

    return res.status(200).json({ data: result });
  })
  ,
  resetPassword: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as { password: string };
    // Only admin can reset other users' passwords
    if (req.user.role !== 'admin') throw unauthorized();

    await resetUserPassword(req.params.id, body.password);

    return res.status(200).json({ data: { ok: true } });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    if (req.user.role !== 'admin') throw unauthorized();

    const body = req.body as { isActive: boolean };
    const user = await updateUserStatus(req.params.id, body.isActive);
    return res.status(200).json({ data: user });
  })
};
