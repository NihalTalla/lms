import { v4 as uuid } from 'uuid';

import { prisma } from '@/config/db';
import { env } from '@/config/env';
import { forbidden, notFound } from '@/utils/apiError';
import { presignPutObject } from '@/utils/s3';

import type { Role } from '@/types/auth';

function toPublicUrl(key: string) {
  const base = env.CLOUDFRONT_DOMAIN.replace(/\/$/, '');
  const k = key.replace(/^\//, '');
  return `${base}/${k}`;
}

export async function listModules(courseId: string, requesterRole: Role) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, isPublished: true }
  });
  if (!course) throw notFound('Not found');

  if (requesterRole === 'student' && !course.isPublished) {
    throw forbidden('Forbidden');
  }

  const where =
    requesterRole === 'student'
      ? {
          courseId,
          isPublished: true
        }
      : { courseId };

  return prisma.module.findMany({
    where,
    orderBy: { order: 'asc' },
    select: {
      id: true,
      courseId: true,
      title: true,
      order: true,
      duration: true,
      isPublished: true,
      createdAt: true
    }
  });
}

export async function createModule(courseId: string, requesterRole: Role, input: {
  title: string;
  content?: string | null;
  duration?: number | null;
  isPublished?: boolean;
  order?: number;
}) {
  if (!['admin', 'faculty'].includes(requesterRole)) throw forbidden('Forbidden');

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) throw notFound('Not found');

  const order =
    typeof input.order === 'number'
      ? input.order
      : (await prisma.module.count({ where: { courseId } })) + 1;

  return prisma.module.create({
    data: {
      courseId,
      title: input.title,
      order,
      content: input.content ?? null,
      duration: input.duration ?? null,
      isPublished: input.isPublished ?? false
    },
    select: {
      id: true,
      courseId: true,
      title: true,
      order: true,
      videoUrl: true,
      content: true,
      duration: true,
      isPublished: true,
      createdAt: true
    }
  });
}

export async function getModule(courseId: string, moduleId: string, requesterRole: Role) {
  const module = await prisma.module.findFirst({
    where:
      requesterRole === 'student'
        ? {
            id: moduleId,
            courseId,
            isPublished: true,
            course: { isPublished: true }
          }
        : { id: moduleId, courseId },
    select: {
      id: true,
      courseId: true,
      title: true,
      order: true,
      videoUrl: true,
      content: true,
      duration: true,
      isPublished: true,
      createdAt: true
    }
  });

  if (!module) throw notFound('Not found');

  return {
    ...module,
    videoUrl: module.videoUrl ? toPublicUrl(module.videoUrl) : null
  };
}

export async function updateModule(courseId: string, moduleId: string, requesterRole: Role, input: {
  title?: string;
  order?: number;
  content?: string | null;
  duration?: number | null;
  isPublished?: boolean;
  videoUrl?: string | null;
}) {
  if (!['admin', 'faculty'].includes(requesterRole)) throw forbidden('Forbidden');

  const existing = await prisma.module.findFirst({
    where: { id: moduleId, courseId },
    select: { id: true }
  });
  if (!existing) throw notFound('Not found');

  return prisma.module.update({
    where: { id: moduleId },
    data: {
      ...(typeof input.title === 'string' ? { title: input.title } : {}),
      ...(typeof input.order === 'number' ? { order: input.order } : {}),
      ...(input.content === null || typeof input.content === 'string' ? { content: input.content } : {}),
      ...(input.duration === null || typeof input.duration === 'number'
        ? { duration: input.duration }
        : {}),
      ...(typeof input.isPublished === 'boolean' ? { isPublished: input.isPublished } : {}),
      ...(input.videoUrl === null || typeof input.videoUrl === 'string' ? { videoUrl: input.videoUrl } : {})
    },
    select: {
      id: true,
      courseId: true,
      title: true,
      order: true,
      videoUrl: true,
      content: true,
      duration: true,
      isPublished: true,
      createdAt: true
    }
  });
}

export async function deleteModule(courseId: string, moduleId: string, requesterRole: Role) {
  if (!['admin', 'faculty'].includes(requesterRole)) throw forbidden('Forbidden');

  const existing = await prisma.module.findFirst({
    where: { id: moduleId, courseId },
    select: { id: true }
  });
  if (!existing) throw notFound('Not found');

  await prisma.module.delete({ where: { id: moduleId } });
  return { status: 'ok' as const };
}

export async function presignModuleVideoUpload(courseId: string, moduleId: string, requesterRole: Role, contentType: string) {
  if (!['admin', 'faculty'].includes(requesterRole)) throw forbidden('Forbidden');

  const module = await prisma.module.findFirst({
    where: { id: moduleId, courseId },
    select: { id: true }
  });
  if (!module) throw notFound('Not found');

  const ext = (() => {
    if (contentType === 'video/mp4') return 'mp4';
    if (contentType === 'video/webm') return 'webm';
    return 'bin';
  })();

  const key = `course-videos/${courseId}/${moduleId}/${uuid()}.${ext}`;

  const presigned = await presignPutObject({
    key,
    contentType,
    expiresInSeconds: 3600
  });

  // Store the S3 key; serving uses CloudFront URL.
  await prisma.module.update({
    where: { id: moduleId },
    data: { videoUrl: key }
  });

  return presigned;
}
