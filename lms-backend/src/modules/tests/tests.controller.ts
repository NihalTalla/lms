import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import {
  addQuestion,
  createTest,
  getMonitoring,
  getMyResult,
  getActiveAttempt,
  getTestById,
  getTestResults,
  listTests,
  startAttempt,
  submitAttempt,
  updateTest
} from './tests.service';

export const testsController = {
  list: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = await listTests({ id: req.user.id, role: req.user.role });
    return res.status(200).json({ data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await createTest(req.body as never);
    return res.status(201).json({ data });
  }),

  getById: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = await getTestById(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(200).json({ data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await updateTest(req.params.id, req.body as never);
    return res.status(200).json({ data });
  }),

  addQuestion: asyncHandler(async (req, res) => {
    const data = await addQuestion(req.params.id, req.body as never);
    return res.status(201).json({ data });
  }),

  startAttempt: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = await startAttempt(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(201).json({ data });
  }),

  activeAttempt: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = await getActiveAttempt(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(200).json({ data });
  }),

  attempt: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = req.body as { answers: Record<string, string> };
    const data = await submitAttempt(req.params.id, { id: req.user.id, role: req.user.role }, body.answers);
    return res.status(201).json(data);
  }),

  results: asyncHandler(async (req, res) => {
    const data = await getTestResults(req.params.id);
    return res.status(200).json({ data });
  }),

  monitoring: asyncHandler(async (req, res) => {
    const data = await getMonitoring(req.params.id);
    return res.status(200).json({ data });
  }),

  myResult: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = await getMyResult(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(200).json({ data });
  })
};
