import { asyncHandler } from '@/utils/asyncHandler';

import {
  createInstitution,
  deleteInstitution,
  getInstitution,
  listInstitutions,
  updateInstitution
} from './institutions.service';

export const institutionsController = {
  list: asyncHandler(async (_req, res) => {
    const data = await listInstitutions();
    return res.status(200).json({ data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await createInstitution(req.body as { name: string });
    return res.status(201).json({ data });
  }),

  get: asyncHandler(async (req, res) => {
    const data = await getInstitution(req.params.id);
    return res.status(200).json({ data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await updateInstitution(req.params.id, req.body as { name: string });
    return res.status(200).json({ data });
  }),

  delete: asyncHandler(async (req, res) => {
    const data = await deleteInstitution(req.params.id);
    return res.status(200).json({ data });
  })
};
