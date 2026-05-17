import { asyncHandler } from '@/utils/asyncHandler';

import { overview, submissionsAnalytics, usersAnalytics } from './analytics.service';

export const analyticsController = {
  overview: asyncHandler(async (_req, res) => {
    const data = await overview();
    return res.status(200).json({ data });
  }),

  submissions: asyncHandler(async (_req, res) => {
    const data = await submissionsAnalytics();
    return res.status(200).json({ data });
  }),

  users: asyncHandler(async (_req, res) => {
    const data = await usersAnalytics();
    return res.status(200).json({ data });
  })
};
