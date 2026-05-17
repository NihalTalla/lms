import bcrypt from 'bcrypt';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

import { prisma } from '@/config/db';
import { env, roleEnum } from '@/config/env';
import { forbidden, notFound } from '@/utils/apiError';
import { presignPutObject } from '@/utils/s3';

const userRoleSchema = roleEnum;
export type UserRole = z.infer<typeof userRoleSchema>;

export interface RequestingUser {
  id: string;
  role: UserRole;
}

function canAccessUser(requester: RequestingUser, targetUserId: string) {
  return requester.role === 'admin' || requester.id === targetUserId;
}

export async function listUsers(params: {
  page: number;
  limit: number;
  role?: UserRole;
  search?: string;
}) {
  const where = {
    ...(params.role ? { role: params.role } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' as const } },
            { email: { contains: params.search, mode: 'insensitive' as const } }
          ]
        }
      : {})
  };

  const skip = (params.page - 1) * params.limit;

  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: params.limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })
  ]);

  return {
    page: params.page,
    limit: params.limit,
    total,
    items
  };
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  institutionId?: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      institutionId: input.institutionId
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function getUserById(requester: RequestingUser, id: string) {
  if (!canAccessUser(requester, id)) {
    throw forbidden('Forbidden');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) throw notFound('Not found');
  return user;
}

export async function updateUser(requester: RequestingUser, id: string, input: {
  email?: string;
  name?: string;
  avatarUrl?: string | null;
  isActive?: boolean;
}) {
  if (!canAccessUser(requester, id)) {
    throw forbidden('Forbidden');
  }

  const data: {
    email?: string;
    name?: string;
    avatarUrl?: string | null;
    isActive?: boolean;
  } = {};

  if (typeof input.email === 'string') data.email = input.email;
  if (typeof input.name === 'string') data.name = input.name;
  if (input.avatarUrl === null || typeof input.avatarUrl === 'string') data.avatarUrl = input.avatarUrl;

  // Only admins can deactivate users.
  if (typeof input.isActive === 'boolean') {
    if (requester.role !== 'admin') throw forbidden('Forbidden');
    data.isActive = input.isActive;
  }

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function updateUserFull(requester: RequestingUser, id: string, input: {
  email?: string;
  name?: string;
  avatarUrl?: string | null;
  isActive?: boolean;
  role?: UserRole;
  institutionId?: string | null;
}) {
  // Only allow admin or owner to perform updates; role/institution changes require admin
  if (!canAccessUser(requester, id)) {
    throw forbidden('Forbidden');
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound('User not found');

  const data: any = {};

  // Email duplicate check
  if (typeof input.email === 'string') {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing && existing.id !== id) throw forbidden('Email already in use');
    data.email = input.email;
  }

  if (typeof input.name === 'string') data.name = input.name;
  if (input.avatarUrl === null || typeof input.avatarUrl === 'string') data.avatarUrl = input.avatarUrl;

  // Institution validation (admin only to change)
  if (input.institutionId !== undefined) {
    if (requester.role !== 'admin') throw forbidden('Forbidden');
    if (input.institutionId !== null) {
      const inst = await prisma.institution.findUnique({ where: { id: input.institutionId } });
      if (!inst) throw notFound('Institution not found');
      data.institutionId = input.institutionId;
    } else {
      data.institutionId = null;
    }
  }

  // Role change (admin only)
  if (input.role !== undefined) {
    if (requester.role !== 'admin') throw forbidden('Forbidden');
    // Validate role value via enum - Type system ensures correctness
    data.role = input.role;
  }

  // Status change (only admin)
  if (typeof input.isActive === 'boolean') {
    if (requester.role !== 'admin') throw forbidden('Forbidden');
    data.isActive = input.isActive;
  }

  // Prevent removing/demoting/deactivating last admin
  const willDemoteOrDeactivateAdmin = (() => {
    if (target.role !== 'admin') return false;
    // if role set and not admin => demotion
    if (input.role !== undefined && input.role !== 'admin') return true;
    // if isActive explicitly false
    if (typeof input.isActive === 'boolean' && input.isActive === false) return true;
    return false;
  })();

  if (willDemoteOrDeactivateAdmin) {
    const otherActiveAdmins = await prisma.user.count({ where: { role: 'admin', isActive: true, NOT: { id } } });
    if (otherActiveAdmins === 0) {
      throw forbidden('Operation would remove the last active admin');
    }
  }

  const updated = await prisma.user.update({ where: { id }, data, select: {
    id: true,
    email: true,
    name: true,
    role: true,
    avatarUrl: true,
    isActive: true,
    institutionId: true,
    createdAt: true,
    updatedAt: true
  }});

  return updated;
}

export async function softDeleteUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function presignAvatarUpload(userId: string, contentType: string) {
  const ext = (() => {
    if (contentType === 'image/png') return 'png';
    if (contentType === 'image/jpeg') return 'jpg';
    if (contentType === 'image/webp') return 'webp';
    return 'bin';
  })();

  const key = `avatars/${userId}/${uuid()}.${ext}`;
  const presigned = await presignPutObject({
    key,
    contentType,
    expiresInSeconds: 3600
  });

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: presigned.publicUrl }
  });

  return presigned;
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const hash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash }
  });
}

export async function updateUserStatus(userId: string, isActive: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
}
