import type { RequestHandler } from 'express';

import type { Role } from '@/types/auth';

export const only = (...roles: Role[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
};
