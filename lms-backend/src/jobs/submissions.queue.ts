import { SendMessageCommand } from '@aws-sdk/client-sqs';

import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { sqs } from '@/config/sqs';

export type SubmissionJob = {
  submissionId: string;
  userId: string;
  problemId: string;
  language: 'python' | 'c' | 'cpp' | 'java';
  code: string;
  contestId?: string;
};

export async function enqueueSubmissionJob(job: SubmissionJob) {
  try {
    const response = await sqs.send(
      new SendMessageCommand({
        QueueUrl: env.SQS_SUBMISSIONS_QUEUE_URL,
        MessageBody: JSON.stringify(job)
      })
    );

    logger.info(
      {
        submissionId: job.submissionId,
        problemId: job.problemId,
        language: job.language,
        messageId: response.MessageId
      },
      'Submission queued for processing'
    );
  } catch (err) {
    logger.error(
      { err, submissionId: job.submissionId },
      'Failed to enqueue submission to SQS'
    );
    throw err;
  }
}
