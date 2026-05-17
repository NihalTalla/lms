import { DeleteMessageCommand, ReceiveMessageCommand } from '@aws-sdk/client-sqs';

import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { sqs } from '@/config/sqs';

import { processSubmission } from './submissions.processor';
import type { SubmissionJob } from './submissions.queue';

function parseSubmissionJob(body: string | undefined): SubmissionJob {
  if (!body) {
    throw new Error('SQS message body is empty');
  }

  return JSON.parse(body) as SubmissionJob;
}

export function startSubmissionsWorker() {
  let stopped = false;

  const poll = async () => {
    while (!stopped) {
      const response = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: env.SQS_SUBMISSIONS_QUEUE_URL,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 60
        })
      );

      for (const message of response.Messages ?? []) {
        try {
          const job = parseSubmissionJob(message.Body);
          await processSubmission(job);

          if (message.ReceiptHandle) {
            await sqs.send(
              new DeleteMessageCommand({
                QueueUrl: env.SQS_SUBMISSIONS_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle
              })
            );
          }

          logger.info({ messageId: message.MessageId }, 'submission sqs message completed');
        } catch (err) {
          logger.error({ err, messageId: message.MessageId }, 'submission sqs message failed');
        }
      }
    }
  };

  void poll().catch((err: unknown) => {
    logger.error({ err }, 'submission sqs poller stopped unexpectedly');
  });

  return {
    close: async () => {
      stopped = true;
    }
  };
}
