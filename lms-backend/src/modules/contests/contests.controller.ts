import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import {
  addProblemToContest,
  createContest,
  getContestById,
  getLeaderboard,
  getMyContestSubmissions,
  joinContest,
  listContests,
  removeProblemFromContest,
  submitToContest,
  updateContest
} from './contests.service';

export const contestsController = {
  list: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const items = await listContests({ id: req.user.id, role: req.user.role });
    return res.status(200).json({ data: items });
  }),

  create: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      title: string;
      description?: string | null;
      startTime: Date;
      endTime: Date;
      isPublic?: boolean;
      batchId?: string | null;
      problems: Array<{ problemId: string; order: number; points?: number }>;
    };

    const contest = await createContest(req.user.role, body);
    return res.status(201).json({ data: contest });
  }),

  update: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      title?: string;
      description?: string | null;
      startTime?: Date;
      endTime?: Date;
      isPublic?: boolean;
      batchId?: string | null;
    };

    const contest = await updateContest(req.params.id, req.user.role, body);
    return res.status(200).json({ data: contest });
  }),

  getById: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const contest = await getContestById(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(200).json({ data: contest });
  }),

  join: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const entry = await joinContest(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(201).json({ data: entry });
  }),

  leaderboard: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const data = await getLeaderboard(req.params.id, { id: req.user.id, role: req.user.role });

    return res.status(200).json({ data });
  }),

  addProblem: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as { problemId: string; points: number; order: number };
    const result = await addProblemToContest(req.params.id, req.user.role, body);
    return res.status(201).json({ data: result });
  }),

  removeProblem: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const result = await removeProblemFromContest(req.params.id, req.params.problemId, req.user.role);
    return res.status(200).json({ data: result });
  }),

  submit: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as { problemId: string; language: 'python' | 'c' | 'cpp' | 'java'; code: string };
    const result = await submitToContest(req.params.id, { id: req.user.id, role: req.user.role }, body);
    return res.status(201).json(result);
  }),

  mySubmissions: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const result = await getMyContestSubmissions(req.params.id, { id: req.user.id, role: req.user.role });
    return res.status(200).json({ data: result });
  })
};
