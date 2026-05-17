import { asyncHandler } from '@/utils/asyncHandler';

import { createSubscription, getActiveSubscription, updateSubscription } from './billing.service';

export const billingController = {
  active: asyncHandler(async (req, res) => {
    const query = req.query as unknown as { institutionId?: string };
    const data = await getActiveSubscription(query.institutionId);
    return res.status(200).json({ data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await createSubscription(req.body as never);
    return res.status(201).json({ data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await updateSubscription(req.params.id, req.body as never);
    return res.status(200).json({ data });
  })
};
