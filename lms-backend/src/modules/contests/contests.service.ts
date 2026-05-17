import { prisma } from '@/config/db';
import { redis } from '@/config/redis';
import { enqueueSubmissionJob } from '@/jobs/submissions.queue';
import { badRequest, conflict, forbidden, notFound } from '@/utils/apiError';

import type { Role } from '@/types/auth';

export interface RequestingUser {
  id: string;
  role: Role;
}

async function getAccessibleBatchIds(userId: string) {
  const enrollments = await prisma.batchEnrollment.findMany({
    where: { userId },
    select: { batchId: true }
  });
  return enrollments.map((e) => e.batchId);
}

export async function listContests(requester: RequestingUser) {
  const where =
    requester.role === 'admin' || requester.role === 'trainer'
      ? {}
      : {
          OR: [
            { isPublic: true },
            {
              batchId: {
                in: await getAccessibleBatchIds(requester.id)
              }
            }
          ]
        };

  const contests = await prisma.contest.findMany({
    where,
    orderBy: { startTime: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      isPublic: true,
      batchId: true,
      createdAt: true,
      _count: {
        select: {
          problems: true,
          entries: true
        }
      }
    }
  });

  return contests.map((contest) => ({
    id: contest.id,
    title: contest.title,
    description: contest.description,
    startTime: contest.startTime,
    endTime: contest.endTime,
    isPublic: contest.isPublic,
    batchId: contest.batchId,
    createdAt: contest.createdAt,
    problemCount: contest._count.problems,
    entryCount: contest._count.entries
  }));
}

export async function createContest(
  requesterRole: Role,
  input: {
    title: string;
    description?: string | null;
    startTime: Date;
    endTime: Date;
    isPublic?: boolean;
    batchId?: string | null;
    problems: Array<{ problemId: string; order: number; points?: number }>;
  }
) {
  if (!['admin', 'trainer'].includes(requesterRole)) throw forbidden('Forbidden');

  return prisma.contest.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      isPublic: input.isPublic ?? false,
      batchId: input.batchId ?? null,
      problems: {
        create: input.problems.map((p) => ({
          problemId: p.problemId,
          order: p.order,
          points: p.points ?? 100
        }))
      }
    },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      isPublic: true,
      batchId: true,
      createdAt: true
    }
  });
}

export async function getContestById(contestId: string, requester: RequestingUser) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      isPublic: true,
      batchId: true,
      createdAt: true,
      problems: {
        orderBy: { order: 'asc' },
        select: {
          order: true,
          points: true,
          problem: {
            select: {
              id: true,
              title: true,
              description: true,
              difficulty: true,
              tags: true,
              timeLimit: true,
              memoryLimit: true
            }
          }
        }
      }
    }
  });

  if (!contest) throw notFound('Not found');

  if (!contest.isPublic && requester.role !== 'admin' && requester.role !== 'trainer') {
    const batchIds = await getAccessibleBatchIds(requester.id);
    if (!contest.batchId || !batchIds.includes(contest.batchId)) {
      throw forbidden('Forbidden');
    }
  }

  const now = new Date();
  if (requester.role === 'student' && contest.startTime > now) {
    return {
      ...contest,
      problems: []
    };
  }

  return contest;
}

export async function updateContest(
  contestId: string,
  requesterRole: Role,
  input: {
    title?: string;
    description?: string | null;
    startTime?: Date;
    endTime?: Date;
    isPublic?: boolean;
    batchId?: string | null;
  }
) {
  if (!['admin', 'trainer'].includes(requesterRole)) throw forbidden('Forbidden');

  return prisma.contest.update({
    where: { id: contestId },
    data: {
      ...(typeof input.title === 'string' ? { title: input.title } : {}),
      ...(input.description === null || typeof input.description === 'string'
        ? { description: input.description }
        : {}),
      ...(input.startTime instanceof Date ? { startTime: input.startTime } : {}),
      ...(input.endTime instanceof Date ? { endTime: input.endTime } : {}),
      ...(typeof input.isPublic === 'boolean' ? { isPublic: input.isPublic } : {}),
      ...(input.batchId === null || typeof input.batchId === 'string' ? { batchId: input.batchId } : {})
    },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      isPublic: true,
      batchId: true,
      createdAt: true
    }
  });
}

export async function joinContest(contestId: string, requester: RequestingUser) {
  if (requester.role !== 'student') throw forbidden('Forbidden');

  const contest = await getContestById(contestId, requester);
  const now = new Date();
  if (contest.endTime < now) throw badRequest('Contest has ended');

  const existing = await prisma.contestEntry.findUnique({
    where: {
      contestId_userId: {
        contestId,
        userId: requester.id
      }
    },
    select: { id: true }
  });

  if (existing) throw conflict('Already joined');

  const entry = await prisma.contestEntry.create({
    data: {
      contestId,
      userId: requester.id
    },
    select: {
      id: true,
      contestId: true,
      userId: true,
      score: true,
      joinedAt: true
    }
  });

  const ttlSeconds = Math.max(1, Math.floor((contest.endTime.getTime() - now.getTime()) / 1000));
  await redis.setex(`contest:active:${requester.id}`, ttlSeconds, contestId);

  return entry;
}

export async function getLeaderboard(contestId: string, requester: RequestingUser) {
  await getContestById(contestId, requester);

  const redisRows = await redis.zrevrange(`leaderboard:${contestId}`, 0, -1, 'WITHSCORES');
  const cachedRows: Array<{ userId: string; score: number }> = [];

  for (let i = 0; i < redisRows.length; i += 2) {
    cachedRows.push({
      userId: redisRows[i],
      score: Number(redisRows[i + 1] ?? 0)
    });
  }

  const rows =
    cachedRows.length > 0
      ? cachedRows
      : await prisma.contestEntry.findMany({
          where: { contestId },
          orderBy: [{ score: 'desc' }, { joinedAt: 'asc' }],
          select: { userId: true, score: true }
        });

  if (cachedRows.length === 0 && rows.length > 0) {
    const pipeline = redis.pipeline();
    for (const row of rows) {
      pipeline.zadd(`leaderboard:${contestId}`, row.score, row.userId);
    }
    await pipeline.exec();
  }

  const [users, acceptedSubmissions] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: rows.map((row) => row.userId) } },
      select: { id: true, name: true }
    }),
    prisma.submission.findMany({
      where: { contestId, verdict: 'accepted' },
      distinct: ['userId', 'problemId'],
      select: { userId: true, problemId: true }
    })
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const solvedByUserId = new Map<string, number>();
  for (const submission of acceptedSubmissions) {
    solvedByUserId.set(submission.userId, (solvedByUserId.get(submission.userId) ?? 0) + 1);
  }

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    name: usersById.get(row.userId)?.name ?? 'Unknown user',
    score: row.score,
    solvedCount: solvedByUserId.get(row.userId) ?? 0
  }));
}

export async function addProblemToContest(
  contestId: string,
  requesterRole: Role,
  input: { problemId: string; points: number; order: number }
) {
  if (!['admin', 'trainer'].includes(requesterRole)) throw forbidden('Forbidden');

  return prisma.contestProblem.create({
    data: {
      contestId,
      problemId: input.problemId,
      points: input.points,
      order: input.order
    },
    select: {
      contestId: true,
      problemId: true,
      points: true,
      order: true
    }
  });
}

export async function removeProblemFromContest(contestId: string, problemId: string, requesterRole: Role) {
  if (!['admin', 'trainer'].includes(requesterRole)) throw forbidden('Forbidden');

  await prisma.contestProblem.delete({
    where: {
      contestId_problemId: {
        contestId,
        problemId
      }
    }
  });

  return { status: 'ok' as const };
}

export async function submitToContest(
  contestId: string,
  requester: RequestingUser,
  input: { problemId: string; language: 'python' | 'c' | 'cpp' | 'java'; code: string }
) {
  if (requester.role !== 'student') throw forbidden('Forbidden');

  const contest = await getContestById(contestId, requester);
  const now = new Date();
  if (now < contest.startTime || now > contest.endTime) {
    throw forbidden('Contest is not active');
  }

  const [entry, contestProblem] = await Promise.all([
    prisma.contestEntry.findUnique({
      where: {
        contestId_userId: {
          contestId,
          userId: requester.id
        }
      },
      select: { id: true }
    }),
    prisma.contestProblem.findUnique({
      where: {
        contestId_problemId: {
          contestId,
          problemId: input.problemId
        }
      },
      select: { contestId: true }
    })
  ]);

  if (!entry) throw forbidden('Join contest first');
  if (!contestProblem) throw notFound('Not found');

  const totalTests = await prisma.testCase.count({
    where: { problemId: input.problemId }
  });

  const submission = await prisma.submission.create({
    data: {
      userId: requester.id,
      contestId,
      problemId: input.problemId,
      language: input.language,
      code: input.code,
      status: 'pending',
      totalTests
    },
    select: { id: true, status: true }
  });

  await enqueueSubmissionJob({
    submissionId: submission.id,
    userId: requester.id,
    contestId,
    problemId: input.problemId,
    language: input.language,
    code: input.code
  });

  return {
    submissionId: submission.id,
    status: submission.status
  };
}

export async function getMyContestSubmissions(contestId: string, requester: RequestingUser) {
  if (requester.role !== 'student') throw forbidden('Forbidden');

  await getContestById(contestId, requester);

  return prisma.submission.findMany({
    where: {
      contestId,
      userId: requester.id
    },
    orderBy: [{ problemId: 'asc' }, { verdict: 'asc' }, { createdAt: 'desc' }],
    distinct: ['problemId'],
    select: {
      id: true,
      problemId: true,
      status: true,
      verdict: true,
      passedTests: true,
      totalTests: true,
      execTimeMs: true,
      createdAt: true,
      problem: {
        select: { id: true, title: true, difficulty: true }
      }
    }
  });
}
