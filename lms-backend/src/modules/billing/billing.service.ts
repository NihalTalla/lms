import { prisma } from '@/config/db';

export async function getActiveSubscription(institutionId?: string) {
  return prisma.subscription.findFirst({
    where: {
      ...(institutionId ? { institutionId } : {}),
      status: 'active',
      expiresAt: { gte: new Date() }
    },
    orderBy: { expiresAt: 'desc' },
    select: {
      id: true,
      institutionId: true,
      plan: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      createdAt: true,
      institution: { select: { id: true, name: true } }
    }
  });
}

export async function createSubscription(input: {
  institutionId: string;
  plan: string;
  status: string;
  startsAt: Date;
  expiresAt: Date;
}) {
  return prisma.subscription.create({
    data: input,
    select: {
      id: true,
      institutionId: true,
      plan: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      createdAt: true
    }
  });
}

export async function updateSubscription(
  id: string,
  input: {
    plan?: string;
    status?: string;
    startsAt?: Date;
    expiresAt?: Date;
  }
) {
  return prisma.subscription.update({
    where: { id },
    data: {
      ...(typeof input.plan === 'string' ? { plan: input.plan } : {}),
      ...(typeof input.status === 'string' ? { status: input.status } : {}),
      ...(input.startsAt instanceof Date ? { startsAt: input.startsAt } : {}),
      ...(input.expiresAt instanceof Date ? { expiresAt: input.expiresAt } : {})
    },
    select: {
      id: true,
      institutionId: true,
      plan: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      createdAt: true
    }
  });
}
