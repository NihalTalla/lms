import { prisma } from '@/config/db';
import { forbidden, notFound } from '@/utils/apiError';

import type { Role } from '@/types/auth';

type Difficulty = 'easy' | 'medium' | 'hard';

export async function listProblems(
  requesterRole: Role,
  params: {
    page: number;
    limit: number;
    difficulty?: Difficulty;
    tags?: string[];
    search?: string;
  }
) {
  const where = {
    ...(requesterRole === 'student' ? { isPublished: true } : {}),
    ...(params.difficulty ? { difficulty: params.difficulty } : {}),
    ...(params.tags && params.tags.length > 0 ? { tags: { hasEvery: params.tags } } : {}),
    ...(params.search
      ? {
          OR: [
            { title: { contains: params.search, mode: 'insensitive' as const } },
            { description: { contains: params.search, mode: 'insensitive' as const } }
          ]
        }
      : {})
  };

  const skip = (params.page - 1) * params.limit;

  const [total, items] = await prisma.$transaction([
    prisma.problem.count({ where }),
    prisma.problem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: params.limit,
      select: {
        id: true,
        title: true,
        difficulty: true,
        tags: true,
        timeLimit: true,
        memoryLimit: true,
        isPublished: true,
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

export async function createProblem(requesterRole: Role, input: {
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit?: number;
  memoryLimit?: number;
  isPublished?: boolean;
}) {
  if (!['admin', 'faculty', 'trainer'].includes(requesterRole)) throw forbidden('Forbidden');

  return prisma.problem.create({
    data: {
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      tags: input.tags,
      timeLimit: input.timeLimit ?? 5000,
      memoryLimit: input.memoryLimit ?? 128,
      isPublished: input.isPublished ?? false
    },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      timeLimit: true,
      memoryLimit: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function getProblemById(problemId: string, requesterRole: Role) {
  const where =
    requesterRole === 'student'
      ? {
          id: problemId,
          isPublished: true
        }
      : { id: problemId };

  const problem = await prisma.problem.findFirst({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      timeLimit: true,
      memoryLimit: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true,
      testCases: {
        where: requesterRole === 'student' ? { isSample: true } : {},
        orderBy: { order: 'asc' },
        select: {
          id: true,
          input: true,
          expected: true,
          isSample: true,
          order: true
        }
      }
    }
  });

  if (!problem) throw notFound('Not found');
  return problem;
}

export async function updateProblem(problemId: string, requesterRole: Role, input: {
  title?: string;
  description?: string;
  difficulty?: Difficulty;
  tags?: string[];
  timeLimit?: number;
  memoryLimit?: number;
  isPublished?: boolean;
}) {
  if (!['admin', 'faculty', 'trainer'].includes(requesterRole)) throw forbidden('Forbidden');

  return prisma.problem.update({
    where: { id: problemId },
    data: {
      ...(typeof input.title === 'string' ? { title: input.title } : {}),
      ...(typeof input.description === 'string' ? { description: input.description } : {}),
      ...(input.difficulty ? { difficulty: input.difficulty } : {}),
      ...(Array.isArray(input.tags) ? { tags: input.tags } : {}),
      ...(typeof input.timeLimit === 'number' ? { timeLimit: input.timeLimit } : {}),
      ...(typeof input.memoryLimit === 'number' ? { memoryLimit: input.memoryLimit } : {}),
      ...(typeof input.isPublished === 'boolean' ? { isPublished: input.isPublished } : {})
    },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      timeLimit: true,
      memoryLimit: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function deleteProblem(problemId: string, requesterRole: Role) {
  if (requesterRole !== 'admin') throw forbidden('Forbidden');

  await prisma.problem.delete({ where: { id: problemId } });
  return { status: 'ok' as const };
}
