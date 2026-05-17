import 'dotenv/config';

import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';

import { logger } from '@/config/logger';
import { prisma } from '@/config/db';
import { processSubmission } from '@/jobs/submissions.processor';
import type { SubmissionJob } from '@/jobs/submissions.queue';

function parseJob(body: string): SubmissionJob {
  return JSON.parse(body) as SubmissionJob;
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  for (const record of event.Records) {
    try {
      const job = parseJob(record.body);

      // IDEMPOTENCY CHECK: Only process if submission is still pending
      const submission = await prisma.submission.findUnique({
        where: { id: job.submissionId },
        select: { id: true, status: true }
      });

      if (!submission) {
        logger.warn(
          { submissionId: job.submissionId },
          'Submission not found - may have been deleted'
        );
        continue;
      }

      if (submission.status !== 'pending') {
        logger.info(
          { submissionId: job.submissionId, currentStatus: submission.status },
          'Submission already processed - skipping (idempotency check)'
        );
        continue;
      }

      logger.info(
        { submissionId: job.submissionId, messageId: record.messageId },
        'Worker processing submission from SQS'
      );

      await processSubmission(job);
    } catch (err) {
      logger.error(
        {
          err,
          messageId: record.messageId,
          body: record.body.substring(0, 200)
        },
        'SQS submission record processing failed'
      );
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
