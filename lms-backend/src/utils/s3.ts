import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '@/config/env';

const s3 = new S3Client({
  region: env.AWS_REGION
});

function joinUrl(base: string, key: string) {
  const b = base.replace(/\/$/, '');
  const k = key.replace(/^\//, '');
  return `${b}/${k}`;
}

export async function presignPutObject(params: {
  key: string;
  contentType: string;
  expiresInSeconds: number;
}) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: params.key,
    ContentType: params.contentType
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: params.expiresInSeconds });
  const publicUrl = joinUrl(env.CLOUDFRONT_DOMAIN, params.key);

  return {
    uploadUrl,
    key: params.key,
    publicUrl,
    expiresIn: params.expiresInSeconds
  };
}
