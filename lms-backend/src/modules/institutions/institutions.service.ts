import { prisma } from '@/config/db';
import { notFound } from '@/utils/apiError';

export async function listInstitutions() {
  return prisma.institution.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { users: true, batches: true, subscriptions: true } }
    }
  });
}

export async function createInstitution(input: { name: string }) {
  return prisma.institution.create({
    data: { name: input.name },
    select: { id: true, name: true, createdAt: true }
  });
}

export async function getInstitution(id: string) {
  const institution = await prisma.institution.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { users: true, batches: true, subscriptions: true } }
    }
  });
  if (!institution) throw notFound('Not found');
  return institution;
}

export async function updateInstitution(id: string, input: { name: string }) {
  return prisma.institution.update({
    where: { id },
    data: { name: input.name },
    select: { id: true, name: true, createdAt: true }
  });
}

export async function deleteInstitution(id: string) {
  await prisma.institution.delete({ where: { id } });
  return { status: 'ok' as const };
}
