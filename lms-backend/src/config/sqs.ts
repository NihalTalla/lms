import { SQSClient, type SQSClientConfig } from '@aws-sdk/client-sqs';

import { env } from './env';

const globalForSqs = globalThis as unknown as { sqs?: SQSClient };

const sqsClientConfig: SQSClientConfig = {
  region: env.AWS_REGION,
  ...(env.SQS_ENDPOINT
    ? {
        endpoint: env.SQS_ENDPOINT,
        credentials: {
          accessKeyId: 'elasticmq',
          secretAccessKey: 'elasticmq'
        }
      }
    : {})
};

export const sqs =
  globalForSqs.sqs ??
  new SQSClient(sqsClientConfig);

if (env.NODE_ENV !== 'production') {
  globalForSqs.sqs = sqs;
}
