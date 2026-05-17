import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

import { logger } from '../src/config/logger';

const prisma = new PrismaClient();

const IDS = {
  institution: '11111111-1111-1111-1111-111111111111',
  batch: '22222222-2222-2222-2222-222222222222',
  problem1: '33333333-3333-3333-3333-333333333333',
  problem2: '44444444-4444-4444-4444-444444444444',
  subscription: '55555555-5555-5555-5555-555555555555'
} as const;

async function createUser(params: {
  email: string;
  password: string;
  name: string;
  role: Role;
  institutionId: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 12);

  return prisma.user.upsert({
    where: { email: params.email },
    create: {
      email: params.email,
      passwordHash,
      name: params.name,
      role: params.role,
      institutionId: params.institutionId
    },
    update: {
      passwordHash,
      name: params.name,
      role: params.role,
      institutionId: params.institutionId,
      isActive: true
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });
}

async function main() {
  // Prevent accidental seeding in production. Seeding must be explicitly enabled.
  // Enable seeding by setting the environment variable SEED=true when running the script.
  if (process.env.NODE_ENV === 'production') {
    logger.info('NODE_ENV=production — skipping database seed (disabled in production)');
    return;
  }

  if (process.env.SEED !== 'true') {
    logger.info('SEED not enabled — skipping database seed. To run seed set SEED=true');
    return;
  }
  const institution = await prisma.institution.upsert({
    where: { id: IDS.institution },
    create: {
      id: IDS.institution,
      name: 'Codify Institute'
    },
    update: {
      name: 'Codify Institute'
    },
    select: { id: true, name: true }
  });

  const admin = await createUser({
    email: 'admin@codify.com',
    password: 'Admin@123',
    name: 'Admin',
    role: Role.admin,
    institutionId: institution.id
  });

  const faculty = await createUser({
    email: 'faculty@codify.com',
    password: 'Faculty@123',
    name: 'Faculty',
    role: Role.faculty,
    institutionId: institution.id
  });

  const trainer = await createUser({
    email: 'trainer@codify.com',
    password: 'Trainer@123',
    name: 'Trainer',
    role: Role.trainer,
    institutionId: institution.id
  });

  const student1 = await createUser({
    email: 'student1@codify.com',
    password: 'Student@123',
    name: 'Student One',
    role: Role.student,
    institutionId: institution.id
  });

  const student2 = await createUser({
    email: 'student2@codify.com',
    password: 'Student@123',
    name: 'Student Two',
    role: Role.student,
    institutionId: institution.id
  });

  const student3 = await createUser({
    email: 'student3@codify.com',
    password: 'Student@123',
    name: 'Student Three',
    role: Role.student,
    institutionId: institution.id
  });

  const batch = await prisma.batch.upsert({
    where: { id: IDS.batch },
    create: {
      id: IDS.batch,
      name: 'Batch 2026',
      institutionId: institution.id
    },
    update: {
      name: 'Batch 2026',
      institutionId: institution.id
    },
    select: { id: true, name: true }
  });

  const enrollments = [
    { batchId: batch.id, userId: admin.id, role: Role.admin },
    { batchId: batch.id, userId: faculty.id, role: Role.faculty },
    { batchId: batch.id, userId: trainer.id, role: Role.trainer },
    { batchId: batch.id, userId: student1.id, role: Role.student },
    { batchId: batch.id, userId: student2.id, role: Role.student },
    { batchId: batch.id, userId: student3.id, role: Role.student }
  ] as const;

  for (const e of enrollments) {
    await prisma.batchEnrollment.upsert({
      where: { batchId_userId: { batchId: e.batchId, userId: e.userId } },
      create: { batchId: e.batchId, userId: e.userId, role: e.role },
      update: { role: e.role }
    });
  }

  const problem1 = await prisma.problem.upsert({
    where: { id: IDS.problem1 },
    create: {
      id: IDS.problem1,
      title: 'Sum Two Numbers',
      description: 'Read two integers and print their sum.',
      difficulty: 'easy',
      tags: ['math', 'io'],
      timeLimit: 5000,
      memoryLimit: 128,
      isPublished: true,
    },
    update: {
      title: 'Sum Two Numbers',
      description: 'Read two integers and print their sum.',
      difficulty: 'easy',
      tags: ['math', 'io'],
      timeLimit: 5000,
      memoryLimit: 128,
      isPublished: true
    },
    select: { id: true, title: true }
  });

  const problem2 = await prisma.problem.upsert({
    where: { id: IDS.problem2 },
    create: {
      id: IDS.problem2,
      title: 'Factorial',
      description: 'Read an integer N and print N! (N factorial).',
      difficulty: 'medium',
      tags: ['math', 'loops'],
      timeLimit: 5000,
      memoryLimit: 128,
      isPublished: true,
    },
    update: {
      title: 'Factorial',
      description: 'Read an integer N and print N! (N factorial).',
      difficulty: 'medium',
      tags: ['math', 'loops'],
      timeLimit: 5000,
      memoryLimit: 128,
      isPublished: true
    },
    select: { id: true, title: true }
  });

  // Replace testcases for seeded problems (safe delete with where clause).
  await prisma.testCase.deleteMany({ where: { problemId: problem1.id } });
  await prisma.testCase.deleteMany({ where: { problemId: problem2.id } });

  await prisma.testCase.createMany({
    data: [
      { problemId: problem1.id, input: '1 2\n', expected: '3\n', isSample: true, order: 1 },
      { problemId: problem1.id, input: '10 20\n', expected: '30\n', isSample: false, order: 2 },
      { problemId: problem1.id, input: '-5 12\n', expected: '7\n', isSample: false, order: 3 },

      { problemId: problem2.id, input: '0\n', expected: '1\n', isSample: true, order: 1 },
      { problemId: problem2.id, input: '5\n', expected: '120\n', isSample: false, order: 2 },
      { problemId: problem2.id, input: '10\n', expected: '3628800\n', isSample: false, order: 3 }
    ]
  });

  // A minimal active subscription for the institution.
  await prisma.subscription.upsert({
    where: { id: IDS.subscription },
    create: {
      id: IDS.subscription,
      institutionId: institution.id,
      plan: 'basic',
      status: 'active',
      startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
    },
    update: {
      plan: 'basic',
      status: 'active'
    }
  });

  logger.info(
    {
    institution,
    batch,
    users: [admin, faculty, trainer, student1, student2, student3],
    problems: [problem1, problem2]
    },
    'seeded database'
  );
}

main()
  .catch(async (e: unknown) => {
    logger.error({ err: e }, 'seed error');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
