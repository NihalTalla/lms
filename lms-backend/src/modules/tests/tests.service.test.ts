import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    test: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    testAttempt: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    batchEnrollment: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('@/config/db', () => ({
  prisma: prismaMock
}));

import { getActiveAttempt, startAttempt, submitAttempt } from './tests.service';

const student = { id: 'student-1', role: 'student' as const };

describe('test attempt timing authority', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T10:00:00.000Z'));
    prismaMock.batchEnrollment.findUnique.mockResolvedValue({ id: 'enrollment-1' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns an existing active attempt instead of creating duplicate timing state', async () => {
    const existing = {
      id: 'attempt-1',
      testId: 'test-1',
      userId: 'student-1',
      startedAt: new Date('2026-05-13T09:55:00.000Z'),
      expiresAt: new Date('2026-05-13T10:55:00.000Z'),
      durationSeconds: 3600,
      status: 'active',
      submittedAt: null
    };

    prismaMock.test.findUnique.mockResolvedValue({
      id: 'test-1',
      batchId: 'batch-1',
      startTime: new Date('2026-05-13T09:00:00.000Z'),
      endTime: new Date('2026-05-13T12:00:00.000Z'),
      durationSeconds: 3600
    });
    prismaMock.testAttempt.findUnique.mockResolvedValue(existing);

    await expect(startAttempt('test-1', student)).resolves.toMatchObject({
      id: 'attempt-1',
      expiresAt: existing.expiresAt,
      serverNow: new Date('2026-05-13T10:00:00.000Z')
    });
    expect(prismaMock.testAttempt.create).not.toHaveBeenCalled();
  });

  it('derives and persists expiresAt when starting a new attempt', async () => {
    prismaMock.test.findUnique.mockResolvedValue({
      id: 'test-1',
      batchId: 'batch-1',
      startTime: null,
      endTime: new Date('2026-05-13T10:30:00.000Z'),
      durationSeconds: 3600
    });
    prismaMock.testAttempt.findUnique.mockResolvedValue(null);
    prismaMock.testAttempt.create.mockImplementation(async ({ data }: any) => ({
      id: 'attempt-2',
      testId: data.testId,
      userId: data.userId,
      startedAt: data.startedAt,
      expiresAt: data.expiresAt,
      durationSeconds: data.durationSeconds,
      status: data.status,
      submittedAt: null
    }));

    await expect(startAttempt('test-1', student)).resolves.toMatchObject({
      id: 'attempt-2',
      startedAt: new Date('2026-05-13T10:00:00.000Z'),
      expiresAt: new Date('2026-05-13T10:30:00.000Z'),
      durationSeconds: 3600,
      status: 'active',
      serverNow: new Date('2026-05-13T10:00:00.000Z')
    });
  });

  it('marks active attempts expired during hydration after expiresAt passes', async () => {
    prismaMock.test.findUnique.mockResolvedValue({ id: 'test-1', batchId: 'batch-1' });
    prismaMock.testAttempt.findUnique.mockResolvedValue({
      id: 'attempt-3',
      testId: 'test-1',
      userId: 'student-1',
      startedAt: new Date('2026-05-13T09:00:00.000Z'),
      expiresAt: new Date('2026-05-13T09:30:00.000Z'),
      durationSeconds: 1800,
      status: 'active',
      submittedAt: null
    });
    prismaMock.testAttempt.update.mockResolvedValue({
      id: 'attempt-3',
      testId: 'test-1',
      userId: 'student-1',
      startedAt: new Date('2026-05-13T09:00:00.000Z'),
      expiresAt: new Date('2026-05-13T09:30:00.000Z'),
      durationSeconds: 1800,
      status: 'expired',
      submittedAt: null
    });

    await expect(getActiveAttempt('test-1', student)).resolves.toMatchObject({
      id: 'attempt-3',
      status: 'expired',
      serverNow: new Date('2026-05-13T10:00:00.000Z')
    });
  });

  it('rejects submit after persisted expiresAt and marks the attempt expired', async () => {
    prismaMock.test.findUnique.mockResolvedValue({
      id: 'test-1',
      batchId: 'batch-1',
      startTime: null,
      endTime: null,
      durationSeconds: 1800,
      questions: [{ id: 'question-1', answer: 'a', points: 1 }]
    });
    prismaMock.testAttempt.findUnique.mockResolvedValue({
      id: 'attempt-4',
      submittedAt: null,
      status: 'active',
      expiresAt: new Date('2026-05-13T09:30:00.000Z')
    });
    prismaMock.testAttempt.update.mockResolvedValue({
      id: 'attempt-4',
      testId: 'test-1',
      userId: 'student-1',
      startedAt: new Date('2026-05-13T09:00:00.000Z'),
      expiresAt: new Date('2026-05-13T09:30:00.000Z'),
      durationSeconds: 1800,
      status: 'expired',
      submittedAt: null
    });

    await expect(submitAttempt('test-1', student, { 'question-1': 'a' })).rejects.toThrow('Attempt has expired');
    expect(prismaMock.testAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attempt-4' },
      data: { status: 'expired' }
    }));
  });
});
