import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '@/middleware/auth';
import { only } from '@/middleware/rbac';
import { validate } from '@/middleware/validate';

import { messagesController } from './messages.controller';

export const messagesRouter = Router();

const idParams = z.object({ id: z.string().uuid() });
const threadParams = z.object({ userId: z.string().uuid() });
const threadQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});
const sendSchema = z.object({
  receiverId: z.string().uuid(),
  content: z.string().min(1).max(5_000)
});

messagesRouter.get('/', authenticate, only('student', 'faculty', 'trainer', 'admin'), messagesController.inbox);
messagesRouter.get('/unread-count', authenticate, only('student', 'faculty', 'trainer', 'admin'), messagesController.unreadCount);
messagesRouter.get(
  '/thread/:userId',
  authenticate,
  only('student', 'faculty', 'trainer', 'admin'),
  validate({ params: threadParams, query: threadQuery }),
  messagesController.thread
);
messagesRouter.post('/', authenticate, only('student', 'faculty', 'trainer', 'admin'), validate(sendSchema), messagesController.send);
messagesRouter.patch('/:id/read', authenticate, only('student', 'faculty', 'trainer', 'admin'), validate({ params: idParams }), messagesController.read);
