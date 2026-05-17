import { v4 as uuid } from 'uuid';

import { presignPutObject } from '@/utils/s3';
import { badRequest } from '@/utils/apiError';

const allowedContentTypes = new Set(['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']);

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 120);
}

function sanitizePrefix(prefix: string) {
  const cleaned = prefix
    .trim()
    .replace(/^\/+/, '')
    .replace(/\.+/g, '')
    .replace(/[^a-zA-Z0-9/_-]+/g, '')
    .replace(/\/+$/g, '');

  return cleaned.length > 0 ? cleaned : 'uploads';
}

export async function presignUpload(input: {
  key?: string;
  prefix?: string;
  filename?: string;
  contentType: string;
}) {
  if (!allowedContentTypes.has(input.contentType)) {
    throw badRequest('Unsupported content type');
  }

  if (input.key) {
    const key = input.key.replace(/^\/+/, '');
    if (key.includes('..')) throw badRequest('Invalid key');
    return presignPutObject({
      key,
      contentType: input.contentType,
      expiresInSeconds: 3600
    });
  }

  const prefix = sanitizePrefix(input.prefix ?? 'uploads');
  const filename = input.filename ? sanitizeFilename(input.filename) : '';

  const key = filename
    ? `${prefix}/${uuid()}-${filename}`
    : `${prefix}/${uuid()}`;

  return presignPutObject({
    key,
    contentType: input.contentType,
    expiresInSeconds: 3600
  });
}
