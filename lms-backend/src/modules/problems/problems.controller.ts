import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import {
  createProblem,
  deleteProblem,
  getProblemById,
  listProblems,
  updateProblem
} from './problems.service';

export const problemsController = {
  list: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const q = req.query as unknown as {
      page: number;
      limit: number;
      difficulty?: 'easy' | 'medium' | 'hard';
      tags?: string;
      search?: string;
    };

    const tags = q.tags
      ? q.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    const result = await listProblems(req.user.role, {
      page: q.page,
      limit: q.limit,
      difficulty: q.difficulty,
      tags,
      search: q.search
    });

    return res.status(200).json({ data: result });
  }),

  create: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      title: string;
      description: string;
      difficulty: 'easy' | 'medium' | 'hard';
      tags: string[];
      timeLimit?: number;
      memoryLimit?: number;
      isPublished?: boolean;
    };

    const problem = await createProblem(req.user.role, body);
    return res.status(201).json({ data: problem });
  }),

  getById: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const problem = await getProblemById(req.params.id, req.user.role);
    return res.status(200).json({ data: problem });
  }),

  update: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      title?: string;
      description?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      tags?: string[];
      timeLimit?: number;
      memoryLimit?: number;
      isPublished?: boolean;
    };

    const problem = await updateProblem(req.params.id, req.user.role, body);
    return res.status(200).json({ data: problem });
  }),

  delete: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const result = await deleteProblem(req.params.id, req.user.role);
    return res.status(200).json({ data: result });
  })
};
