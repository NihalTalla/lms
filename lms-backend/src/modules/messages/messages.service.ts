import { prisma } from '@/config/db';
import { forbidden, notFound } from '@/utils/apiError';

export async function listInbox(userId: string) {
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }]
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      isRead: true,
      createdAt: true,
      sender: { select: { id: true, name: true, avatarUrl: true } },
      receiver: { select: { id: true, name: true, avatarUrl: true } }
    }
  });

  const conversations = new Map<string, (typeof messages)[number] & { unreadCount: number }>();

  for (const message of messages) {
    const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
    const existing = conversations.get(otherUserId);
    const unreadIncrement = message.receiverId === userId && !message.isRead ? 1 : 0;

    if (!existing) {
      conversations.set(otherUserId, { ...message, unreadCount: unreadIncrement });
    } else {
      existing.unreadCount += unreadIncrement;
    }
  }

  return Array.from(conversations.values());
}

export async function getThread(userId: string, otherUserId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  await prisma.message.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: userId,
      isRead: false
    },
    data: { isRead: true }
  });

  const [total, items] = await prisma.$transaction([
    prisma.message.count({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      }
    }),
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        isRead: true,
        createdAt: true
      }
    })
  ]);

  return { page, limit, total, items };
}

export async function sendMessage(senderId: string, input: { receiverId: string; content: string }) {
  const receiver = await prisma.user.findUnique({
    where: { id: input.receiverId },
    select: { id: true }
  });
  if (!receiver) throw notFound('Not found');

  return prisma.message.create({
    data: {
      senderId,
      receiverId: input.receiverId,
      content: input.content
    },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      isRead: true,
      createdAt: true
    }
  });
}

export async function markRead(userId: string, messageId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, receiverId: true }
  });
  if (!message) throw notFound('Not found');
  if (message.receiverId !== userId) throw forbidden('Forbidden');

  return prisma.message.update({
    where: { id: messageId },
    data: { isRead: true },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      isRead: true,
      createdAt: true
    }
  });
}

export async function unreadCount(userId: string) {
  const count = await prisma.message.count({
    where: {
      receiverId: userId,
      isRead: false
    }
  });

  return { count };
}
