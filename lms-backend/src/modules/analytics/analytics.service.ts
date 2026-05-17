import { prisma } from '@/config/db';
import { redis } from '@/config/redis';

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekKey(date: Date) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function overview() {
  const cached = await redis.get('analytics:overview');
  if (cached) return JSON.parse(cached) as unknown;

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    usersByRole,
    activeUsers,
    totalCourses,
    totalSubmissions,
    submissionsByVerdict,
    recentActivity
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    prisma.user.count({ where: { updatedAt: { gte: since30 } } }),
    prisma.course.count(),
    prisma.submission.count(),
    prisma.submission.groupBy({ by: ['verdict'], _count: { verdict: true } }),
    prisma.submission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        verdict: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        problem: { select: { id: true, title: true } }
      }
    })
  ]);

  const data = {
    totalUsers: Object.fromEntries(usersByRole.map((row) => [row.role, row._count.role])),
    activeUsers,
    totalCourses,
    totalSubmissions,
    submissionsByVerdict: Object.fromEntries(
      submissionsByVerdict.map((row) => [row.verdict ?? 'pending', row._count.verdict])
    ),
    recentActivity
  };

  await redis.setex('analytics:overview', 300, JSON.stringify(data));
  return data;
}

export async function submissionsAnalytics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const submissions = await prisma.submission.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, verdict: true }
  });

  const byDay = new Map<string, { date: string; total: number; accepted: number }>();
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = dayKey(date);
    byDay.set(key, { date: key, total: 0, accepted: 0 });
  }

  for (const submission of submissions) {
    const key = dayKey(submission.createdAt);
    const row = byDay.get(key);
    if (row) {
      row.total += 1;
      if (submission.verdict === 'accepted') row.accepted += 1;
    }
  }

  return Array.from(byDay.values());
}

export async function usersAnalytics() {
  const since = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);

  const [countsByRole, users] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true }
    })
  ]);

  const newUsersPerWeek = new Map<string, number>();
  for (let i = 7; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    newUsersPerWeek.set(weekKey(date), 0);
  }

  for (const user of users) {
    const key = weekKey(user.createdAt);
    newUsersPerWeek.set(key, (newUsersPerWeek.get(key) ?? 0) + 1);
  }

  return {
    countsByRole: Object.fromEntries(countsByRole.map((row) => [row.role, row._count.role])),
    newUsersPerWeek: Array.from(newUsersPerWeek.entries()).map(([week, count]) => ({ week, count }))
  };
}
