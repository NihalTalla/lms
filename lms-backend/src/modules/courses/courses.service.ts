import { prisma } from '@/config/db';
import { forbidden, notFound } from '@/utils/apiError';

import type { Role } from '@/types/auth';

export async function listCourses(requesterRole: Role) {
  const where = requesterRole === 'student' ? { isPublished: true } : {};

  const items = await prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return items;
}

export async function createCourse(input: {
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
}) {
  return prisma.course.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function getCourseById(courseId: string, requesterRole: Role) {
  const where =
    requesterRole === 'student'
      ? {
          id: courseId,
          isPublished: true
        }
      : { id: courseId };

  const course = await prisma.course.findFirst({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true,
      modules: {
        where: requesterRole === 'student' ? { isPublished: true } : {},
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          duration: true,
          isPublished: true,
          createdAt: true
        }
      }
    }
  });

  if (!course) throw notFound('Not found');
  return course;
}

export async function updateCourse(courseId: string, requesterRole: Role, input: {
  title?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  isPublished?: boolean;
}) {
  if (!['admin', 'faculty'].includes(requesterRole)) throw forbidden('Forbidden');

  return prisma.course.update({
    where: { id: courseId },
    data: {
      ...(typeof input.title === 'string' ? { title: input.title } : {}),
      ...(input.description === null || typeof input.description === 'string'
        ? { description: input.description }
        : {}),
      ...(input.thumbnailUrl === null || typeof input.thumbnailUrl === 'string'
        ? { thumbnailUrl: input.thumbnailUrl }
        : {}),
      ...(typeof input.isPublished === 'boolean' ? { isPublished: input.isPublished } : {})
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function deleteCourse(courseId: string, requesterRole: Role) {
  if (requesterRole !== 'admin') throw forbidden('Forbidden');

  const linked = await prisma.batchCourse.count({
    where: { courseId }
  });

  if (linked > 0) {
    throw forbidden('Course has active enrollments');
  }

  await prisma.course.delete({ where: { id: courseId } });
  return { status: 'ok' as const };
}
