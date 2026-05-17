import { prisma } from '@/config/db';
import { forbidden, notFound } from '@/utils/apiError';

import type { Role } from '@/types/auth';

export async function listTestCases(problemId: string, requesterRole: Role) {
  if (!['admin', 'faculty', 'trainer'].includes(requesterRole)) throw forbidden('Forbidden');

  const problem = await prisma.problem.findUnique({ where: { id: problemId }, select: { id: true } });
  if (!problem) throw notFound('Not found');

  return prisma.testCase.findMany({
    where: { problemId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      problemId: true,
      input: true,
      expected: true,
      isSample: true,
      order: true
    }
  });
}

export async function createTestCase(problemId: string, requesterRole: Role, input: {
  input: string;
  expected: string;
  isSample?: boolean;
  order?: number;
}) {
  if (!['admin', 'faculty', 'trainer'].includes(requesterRole)) throw forbidden('Forbidden');

  const problem = await prisma.problem.findUnique({ where: { id: problemId }, select: { id: true } });
  if (!problem) throw notFound('Not found');

  const order =
    typeof input.order === 'number'
      ? input.order
      : (await prisma.testCase.count({ where: { problemId } })) + 1;

  return prisma.testCase.create({
    data: {
      problemId,
      input: input.input,
      expected: input.expected,
      isSample: input.isSample ?? false,
      order
    },
    select: {
      id: true,
      problemId: true,
      input: true,
      expected: true,
      isSample: true,
      order: true
    }
  });
}

export async function updateTestCase(
  problemId: string,
  caseId: string,
  requesterRole: Role,
  input: {
    input?: string;
    expected?: string;
    isSample?: boolean;
    order?: number;
  }
) {
  if (!['admin', 'faculty', 'trainer'].includes(requesterRole)) throw forbidden('Forbidden');

  const existing = await prisma.testCase.findFirst({
    where: { id: caseId, problemId },
    select: { id: true }
  });
  if (!existing) throw notFound('Not found');

  return prisma.testCase.update({
    where: { id: caseId },
    data: {
      ...(typeof input.input === 'string' ? { input: input.input } : {}),
      ...(typeof input.expected === 'string' ? { expected: input.expected } : {}),
      ...(typeof input.isSample === 'boolean' ? { isSample: input.isSample } : {}),
      ...(typeof input.order === 'number' ? { order: input.order } : {})
    },
    select: {
      id: true,
      problemId: true,
      input: true,
      expected: true,
      isSample: true,
      order: true
    }
  });
}

export async function deleteTestCase(problemId: string, caseId: string, requesterRole: Role) {
  if (requesterRole !== 'admin') throw forbidden('Forbidden');

  const existing = await prisma.testCase.findFirst({
    where: { id: caseId, problemId },
    select: { id: true }
  });
  if (!existing) throw notFound('Not found');

  await prisma.testCase.delete({ where: { id: caseId } });
  return { status: 'ok' as const };
}
