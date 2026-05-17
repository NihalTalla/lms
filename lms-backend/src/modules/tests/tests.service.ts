import { prisma } from '@/config/db';
import { badRequest, conflict, forbidden, notFound } from '@/utils/apiError';

import type { Prisma } from '@prisma/client';
import type { Role } from '@/types/auth';

export interface RequestingUser {
  id: string;
  role: Role;
}

type QuestionInput = {
  text: string;
  options: Prisma.InputJsonValue;
  answer: string;
  points: number;
  order: number;
};

async function ensureBatchAccess(user: RequestingUser, batchId: string) {
  if (user.role === 'admin' || user.role === 'trainer' || user.role === 'faculty') return;

  const enrollment = await prisma.batchEnrollment.findUnique({
    where: { batchId_userId: { batchId, userId: user.id } },
    select: { id: true }
  });
  if (!enrollment) throw forbidden('Forbidden');
}

export async function listTests(user: RequestingUser) {
  const now = new Date();
  const batchIds =
    user.role === 'student'
      ? (
          await prisma.batchEnrollment.findMany({
            where: { userId: user.id },
            select: { batchId: true }
          })
        ).map((item) => item.batchId)
      : undefined;

  return prisma.test.findMany({
    where:
      user.role === 'student'
        ? {
            batchId: { in: batchIds ?? [] },
            OR: [{ startTime: null }, { startTime: { lte: now } }]
          }
        : {},
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      batchId: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      createdAt: true,
      _count: { select: { questions: true, attempts: true } }
    }
  });
}

export async function createTest(input: {
  batchId: string;
  title: string;
  description?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  durationSeconds?: number | null;
  questions: QuestionInput[];
}) {
  return prisma.test.create({
    data: {
      batchId: input.batchId,
      title: input.title,
      description: input.description ?? null,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      durationSeconds: input.durationSeconds ?? null,
      questions: {
        create: input.questions.map((question) => ({
          text: question.text,
          options: question.options,
          answer: question.answer,
          points: question.points,
          order: question.order
        }))
      }
    },
    select: {
      id: true,
      batchId: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      durationSeconds: true,
      createdAt: true
    }
  });
}

export async function getTestById(testId: string, user: RequestingUser) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      batchId: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      durationSeconds: true,
      createdAt: true,
      questions: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          text: true,
          options: true,
          answer: true,
          points: true,
          order: true
        }
      }
    }
  });

  if (!test) throw notFound('Not found');
  await ensureBatchAccess(user, test.batchId);

  const now = new Date();
  if (user.role === 'student' && test.startTime && test.startTime > now) {
    throw forbidden('Test has not started');
  }

  if (user.role !== 'student') return test;

  return {
    ...test,
    questions: test.questions.map(({ answer: _answer, ...question }) => question)
  };
}

export async function updateTest(
  testId: string,
  input: {
    title?: string;
    description?: string | null;
    startTime?: Date | null;
    endTime?: Date | null;
    durationSeconds?: number | null;
  }
) {
  return prisma.test.update({
    where: { id: testId },
    data: {
      ...(typeof input.title === 'string' ? { title: input.title } : {}),
      ...(input.description === null || typeof input.description === 'string'
        ? { description: input.description }
        : {}),
      ...(input.startTime === null || input.startTime instanceof Date ? { startTime: input.startTime } : {}),
      ...(input.endTime === null || input.endTime instanceof Date ? { endTime: input.endTime } : {}),
      ...(input.durationSeconds === null || typeof input.durationSeconds === 'number' ? { durationSeconds: input.durationSeconds } : {})
    },
    select: {
      id: true,
      batchId: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      durationSeconds: true,
      createdAt: true
    }
  });
}

export async function addQuestion(testId: string, question: QuestionInput) {
  const test = await prisma.test.findUnique({ where: { id: testId }, select: { id: true } });
  if (!test) throw notFound('Not found');

  return prisma.testQuestion.create({
    data: {
      testId,
      text: question.text,
      options: question.options,
      answer: question.answer,
      points: question.points,
      order: question.order
    },
    select: {
      id: true,
      testId: true,
      text: true,
      options: true,
      answer: true,
      points: true,
      order: true
    }
  });
}

const DEFAULT_TEST_DURATION_SECONDS = 60 * 60;

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function attemptPayload(attempt: {
  id: string;
  testId: string;
  userId: string;
  startedAt: Date;
  expiresAt: Date;
  durationSeconds: number;
  status: string;
  submittedAt: Date | null;
}, serverNow = new Date()) {
  return {
    ...attempt,
    serverNow
  };
}

async function expireAttempt(attemptId: string) {
  return prisma.testAttempt.update({
    where: { id: attemptId },
    data: { status: 'expired' },
    select: {
      id: true,
      testId: true,
      userId: true,
      startedAt: true,
      expiresAt: true,
      durationSeconds: true,
      status: true,
      submittedAt: true
    }
  });
}

export async function startAttempt(testId: string, user: RequestingUser) {
  if (user.role !== 'student') throw forbidden('Forbidden');

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      batchId: true,
      startTime: true,
      endTime: true,
      durationSeconds: true
    }
  });

  if (!test) throw notFound('Not found');
  await ensureBatchAccess(user, test.batchId);

  const now = new Date();
  if (test.startTime && test.startTime > now) throw badRequest('Test has not started');
  if (test.endTime && test.endTime < now) throw badRequest('Test has ended');

  const existing = await prisma.testAttempt.findUnique({
    where: { testId_userId: { testId, userId: user.id } },
    select: {
      id: true,
      testId: true,
      userId: true,
      startedAt: true,
      expiresAt: true,
      durationSeconds: true,
      status: true,
      submittedAt: true
    }
  });

  if (existing) {
    if (existing.status === 'active' && existing.expiresAt <= now) {
      await expireAttempt(existing.id);
      throw badRequest('Attempt has expired');
    }
    if (existing.status === 'active') return attemptPayload(existing, now);
    throw conflict('Attempt already completed');
  }

  const durationSeconds = test.durationSeconds ?? DEFAULT_TEST_DURATION_SECONDS;
  const policyExpiresAt = addSeconds(now, durationSeconds);
  const expiresAt = test.endTime && test.endTime < policyExpiresAt ? test.endTime : policyExpiresAt;

  const attempt = await prisma.testAttempt.create({
    data: {
      testId,
      userId: user.id,
      answers: {},
      startedAt: now,
      expiresAt,
      durationSeconds,
      status: 'active'
    },
    select: {
      id: true,
      testId: true,
      userId: true,
      startedAt: true,
      expiresAt: true,
      durationSeconds: true,
      status: true,
      submittedAt: true
    }
  });

  return attemptPayload(attempt, now);
}

export async function getActiveAttempt(testId: string, user: RequestingUser) {
  if (user.role !== 'student') throw forbidden('Forbidden');

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, batchId: true }
  });
  if (!test) throw notFound('Not found');
  await ensureBatchAccess(user, test.batchId);

  const attempt = await prisma.testAttempt.findUnique({
    where: { testId_userId: { testId, userId: user.id } },
    select: {
      id: true,
      testId: true,
      userId: true,
      startedAt: true,
      expiresAt: true,
      durationSeconds: true,
      status: true,
      submittedAt: true
    }
  });

  if (!attempt) throw notFound('Not found');

  const now = new Date();
  if (attempt.status === 'active' && attempt.expiresAt <= now) {
    const expired = await expireAttempt(attempt.id);
    return attemptPayload(expired, now);
  }

  return attemptPayload(attempt, now);
}

export async function submitAttempt(testId: string, user: RequestingUser, answers: Record<string, string>) {
  if (user.role !== 'student') throw forbidden('Forbidden');

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      batchId: true,
      startTime: true,
      endTime: true,
      durationSeconds: true,
      questions: {
        select: { id: true, answer: true, points: true }
      }
    }
  });

  if (!test) throw notFound('Not found');
  await ensureBatchAccess(user, test.batchId);

  const now = new Date();
  if (test.startTime && test.startTime > now) throw badRequest('Test has not started');
  if (test.endTime && test.endTime < now) throw badRequest('Test has ended');

  const existing = await prisma.testAttempt.findUnique({
    where: { testId_userId: { testId, userId: user.id } },
    select: { id: true, submittedAt: true, status: true, expiresAt: true }
  });
  if (existing?.submittedAt) throw conflict('Attempt already submitted');
  if (!existing) throw badRequest('Start attempt before submitting');
  if (existing.status !== 'active') throw badRequest('Attempt is not active');
  if (existing.expiresAt <= now) {
    await expireAttempt(existing.id);
    throw badRequest('Attempt has expired');
  }

  let score = 0;
  let correctCount = 0;
  let maxScore = 0;

  for (const question of test.questions) {
    maxScore += question.points;
    if (answers[question.id] === question.answer) {
      score += question.points;
      correctCount += 1;
    }
  }

  await prisma.testAttempt.update({
    where: { testId_userId: { testId, userId: user.id } },
    data: {
      answers,
      score,
      submittedAt: now,
      status: 'submitted'
    }
  });

  return {
    score,
    maxScore,
    correctCount,
    totalCount: test.questions.length
  };
}

export async function getTestResults(testId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, questions: { select: { points: true } } }
  });
  if (!test) throw notFound('Not found');

  const attempts = await prisma.testAttempt.findMany({
    where: { testId, submittedAt: { not: null } },
    orderBy: { submittedAt: 'desc' },
    select: {
      userId: true,
      score: true,
      submittedAt: true,
      user: { select: { id: true, name: true, email: true } }
    }
  });

  const maxScore = test.questions.reduce((sum, question) => sum + question.points, 0);
  const scores = attempts.map((attempt) => attempt.score ?? 0);
  const avgScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  const passRate = scores.length ? scores.filter((score) => score >= maxScore * 0.5).length / scores.length : 0;

  return {
    attempts,
    aggregate: {
      avgScore,
      maxScore,
      passRate
    }
  };
}

export async function getMonitoring(testId: string) {
  const test = await prisma.test.findUnique({ where: { id: testId }, select: { id: true } });
  if (!test) throw notFound('Not found');

  return prisma.testAttempt.findMany({
    where: { testId },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      userId: true,
      score: true,
      startedAt: true,
      submittedAt: true,
      user: { select: { id: true, name: true, email: true } }
    }
  });
}

export async function getMyResult(testId: string, user: RequestingUser) {
  if (user.role !== 'student') throw forbidden('Forbidden');

  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      id: true,
      endTime: true,
      questions: {
        orderBy: { order: 'asc' },
        select: { id: true, text: true, options: true, answer: true, points: true, order: true }
      },
      attempts: {
        where: { userId: user.id },
        select: { answers: true, score: true, submittedAt: true }
      }
    }
  });

  if (!test) throw notFound('Not found');
  const attempt = test.attempts[0];
  if (!attempt) throw notFound('Not found');

  const answers = attempt.answers as Record<string, string>;
  const showCorrect = Boolean(test.endTime && test.endTime < new Date());

  return {
    score: attempt.score,
    submittedAt: attempt.submittedAt,
    questions: test.questions.map((question) => ({
      id: question.id,
      text: question.text,
      options: question.options,
      selected: answers[question.id] ?? null,
      isCorrect: answers[question.id] === question.answer,
      points: question.points,
      ...(showCorrect ? { answer: question.answer } : {})
    }))
  };
}
