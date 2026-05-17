import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import { getThread, listInbox, markRead, sendMessage, unreadCount } from './messages.service';

export const messagesController = {
  inbox: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = await listInbox(req.user.id);
    return res.status(200).json({ data });
  }),

  thread: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const query = req.query as unknown as { page: number; limit: number };
    const data = await getThread(req.user.id, req.params.userId, query.page, query.limit);
    return res.status(200).json({ data });
  }),

  send: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = req.body as { receiverId: string; content: string };
    const data = await sendMessage(req.user.id, body);
    return res.status(201).json({ data });
  }),

  read: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = await markRead(req.user.id, req.params.id);
    return res.status(200).json({ data });
  }),

  unreadCount: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = await unreadCount(req.user.id);
    return res.status(200).json(data);
  })
};
