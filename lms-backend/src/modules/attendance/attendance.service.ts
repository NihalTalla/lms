import { prisma } from '@/config/db';
import { RequestingUser } from '../users/users.service';
import { forbidden, notFound } from '@/utils/apiError';

export async function listAttendanceSessions(batchId?: string) {
  const where = batchId ? { batchId } : {};
  return prisma.attendanceSession.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { marks: true }
  });
}

export async function createAttendanceSession(data: { courseId: string; courseTitle: string; batchId?: string }) {
  return prisma.attendanceSession.create({ data });
}

export async function closeAttendanceSession(sessionId: string) {
  const s = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!s) throw notFound('Session not found');
  return prisma.attendanceSession.update({ where: { id: sessionId }, data: { status: 'closed' } });
}

export async function markAttendance(requester: RequestingUser, sessionId: string) {
  // Ensure session exists and is open
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) throw notFound('Session not found');
  if (session.status !== 'open') throw forbidden('Session is closed');

  // Upsert mark (unique constraint prevents duplicates)
  return prisma.attendanceMark.upsert({
    where: { sessionId_userId: { sessionId, userId: requester.id } },
    update: { markedAt: new Date() },
    create: { sessionId, userId: requester.id }
  });
}
