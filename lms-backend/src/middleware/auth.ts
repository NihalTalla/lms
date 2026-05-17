import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { env, roleEnum } from '@/config/env';

const accessPayloadSchema = z.object({
  id: z.string().min(1),
  role: roleEnum,
  email: z.string().email()
});

export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const payload = accessPayloadSchema.parse(decoded);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
