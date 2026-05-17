import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import {
  createSubmission,
  getGradingQueue,
  getSubmissionById,
  gradeSubmission,
  listSubmissions,
  listPendingSubmissionsForUser
} from './submissions.service';

export const submissionsController = {
  create: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      problemId: string;
      language: 'python' | 'c' | 'cpp' | 'java';
      code: string;
      contestId?: string;
    };

    const result = await createSubmission({ id: req.user.id, role: req.user.role }, body);

    // Match contract: success shape is top-level.
    return res.status(201).json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const submission = await getSubmissionById({ id: req.user.id, role: req.user.role }, req.params.id);
    return res.status(200).json({ data: submission });
  }),

  list: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const query = req.query as unknown as {
      page: number;
      limit: number;
      status?: 'pending' | 'running' | 'completed' | 'failed';
      problemId?: string;
      contestId?: string;
    };

    const result = await listSubmissions({ id: req.user.id, role: req.user.role }, query);
    return res.status(200).json({ data: result });
  }),

  gradingQueue: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const result = await getGradingQueue();
    return res.status(200).json({ data: result });
  }),

  grade: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      verdict:
        | 'accepted'
        | 'wrong_answer'
        | 'time_limit_exceeded'
        | 'memory_limit_exceeded'
        | 'runtime_error'
        | 'compilation_error';
      score?: number;
    };

    const result = await gradeSubmission(req.params.id, body, req.user.id);
    return res.status(200).json({ data: result });
  })
  ,

  recover: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const items = await listPendingSubmissionsForUser({ id: req.user.id, role: req.user.role });
    return res.status(200).json({ data: items });
  })
};
