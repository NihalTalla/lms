import { prisma } from '@/config/db';
import { forbidden, notFound } from '@/utils/apiError';

import type { Role } from '@/types/auth';

export interface RequestingUser {
  id: string;
  role: Role;
}

async function ensureBatchAccess(batchId: string, requester: RequestingUser) {
  if (requester.role === 'admin') return;

  const enrollment = await prisma.batchEnrollment.findUnique({
    where: {
      batchId_userId: {
        batchId,
        userId: requester.id
      }
    },
    select: { id: true }
  });

  if (!enrollment) throw forbidden('Forbidden');
}

export async function listBatches(requester: RequestingUser) {
  if (requester.role === 'admin') {
    return prisma.batch.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        institutionId: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  const enrollments = await prisma.batchEnrollment.findMany({
    where: {
      userId: requester.id
    },
    orderBy: { joinedAt: 'desc' },
    select: {
      batch: {
        select: {
          id: true,
          name: true,
          institutionId: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  return enrollments.map((e) => e.batch);
}

export async function createBatch(input: {
  name: string;
  institutionId?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}) {
  return prisma.batch.create({
    data: {
      name: input.name,
      institutionId: input.institutionId,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null
    },
    select: {
      id: true,
      name: true,
      institutionId: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function getBatchById(batchId: string, requester: RequestingUser) {
  await ensureBatchAccess(batchId, requester);

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      name: true,
      institutionId: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { enrollments: true }
      }
    }
  });

  if (!batch) throw notFound('Not found');

  return {
    ...batch,
    enrolledCount: batch._count.enrollments
  };
}

export async function updateBatch(batchId: string, input: {
  name?: string;
  institutionId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}) {
  return prisma.batch.update({
    where: { id: batchId },
    data: {
      ...(typeof input.name === 'string' ? { name: input.name } : {}),
      ...(input.institutionId === null || typeof input.institutionId === 'string'
        ? { institutionId: input.institutionId }
        : {}),
      ...(input.startDate === null || input.startDate instanceof Date
        ? { startDate: input.startDate }
        : {}),
      ...(input.endDate === null || input.endDate instanceof Date ? { endDate: input.endDate } : {})
    },
    select: {
      id: true,
      name: true,
      institutionId: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function deleteBatch(batchId: string) {
  await prisma.batch.delete({ where: { id: batchId } });
  return { status: 'ok' as const };
}

export async function listBatchStudents(batchId: string, requester: RequestingUser) {
  await ensureBatchAccess(batchId, requester);

  const students = await prisma.batchEnrollment.findMany({
    where: {
      batchId,
      role: 'student'
    },
    orderBy: { joinedAt: 'desc' },
    select: {
      joinedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isActive: true
        }
      }
    }
  });

  return students;
}

export async function enrollUser(batchId: string, input: { userId: string; role: Role }) {
  // Ensure batch exists
  const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true } });
  if (!batch) throw notFound('Not found');

  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });
  if (!user) throw notFound('Not found');

  return prisma.batchEnrollment.upsert({
    where: {
      batchId_userId: {
        batchId,
        userId: input.userId
      }
    },
    create: {
      batchId,
      userId: input.userId,
      role: input.role
    },
    update: {
      role: input.role
    },
    select: {
      id: true,
      batchId: true,
      userId: true,
      role: true,
      joinedAt: true
    }
  });
}

export async function unenrollUser(batchId: string, userId: string) {
  await prisma.batchEnrollment.deleteMany({
    where: { batchId, userId }
  });

  return { status: 'ok' as const };
}

export async function listBatchCourses(batchId: string, requester: RequestingUser) {
  await ensureBatchAccess(batchId, requester);

  const items = await prisma.batchCourse.findMany({
    where: {
      batchId,
      ...(requester.role === 'student' ? { course: { isPublished: true } } : {})
    },
    orderBy: { course: { createdAt: 'desc' } },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  return items.map((i) => i.course);
}

export async function addCourseToBatch(batchId: string, requester: RequestingUser, courseId: string) {
  if (!['admin', 'faculty'].includes(requester.role)) throw forbidden('Forbidden');
  await ensureBatchAccess(batchId, requester);

  const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true } });
  if (!batch) throw notFound('Not found');

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) throw notFound('Not found');

  await prisma.batchCourse.create({
    data: {
      batchId,
      courseId
    }
  });

  return { status: 'ok' as const };
}
