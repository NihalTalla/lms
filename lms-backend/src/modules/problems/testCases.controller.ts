import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import { createTestCase, deleteTestCase, listTestCases, updateTestCase } from './testCases.service';

export const testCasesController = {
  list: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const items = await listTestCases(req.params.id, req.user.role);
    return res.status(200).json({ data: items });
  }),

  create: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      input: string;
      expected: string;
      isSample?: boolean;
      order?: number;
    };

    const testCase = await createTestCase(req.params.id, req.user.role, body);
    return res.status(201).json({ data: testCase });
  }),

  update: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as {
      input?: string;
      expected?: string;
      isSample?: boolean;
      order?: number;
    };

    const testCase = await updateTestCase(req.params.id, req.params.caseId, req.user.role, body);
    return res.status(200).json({ data: testCase });
  }),

  delete: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const result = await deleteTestCase(req.params.id, req.params.caseId, req.user.role);
    return res.status(200).json({ data: result });
  })
};
