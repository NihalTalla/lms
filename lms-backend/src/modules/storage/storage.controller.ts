import { asyncHandler } from '@/utils/asyncHandler';
import { unauthorized } from '@/utils/apiError';

import { presignUpload } from './storage.service';

export const storageController = {
  presign: asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();

    const body = req.body as { key?: string; prefix?: string; filename?: string; contentType: string };
    const result = await presignUpload(body);

    return res.status(200).json({ data: result });
  })
};
