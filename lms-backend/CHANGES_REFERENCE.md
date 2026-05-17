# Key Changes Reference

## Runtime Verification Additions

- Local SQS-compatible queue support is available through ElasticMQ in `docker-compose.dev.yml`.
- `SQS_ENDPOINT` is optional and points the AWS SDK SQS client at a local endpoint when set.
- Local queue URL:

```env
SQS_ENDPOINT=http://localhost:9324
SQS_SUBMISSIONS_QUEUE_URL=http://localhost:9324/000000000000/submissions
```

## Health Check

`GET /health` checks the configured queue directly:

```typescript
const { GetQueueAttributesCommand } = await import('@aws-sdk/client-sqs');

await sqs.send(
  new GetQueueAttributesCommand({
    QueueUrl: env.SQS_SUBMISSIONS_QUEUE_URL,
    AttributeNames: ['QueueArn']
  })
);
```

Expected healthy response:

```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "sqs": "ok"
}
```

## Submission Proof Script

Run:

```powershell
npm run verify:submission-flow
```

The script logs in through `POST /api/auth/login`, submits the seeded Sum Two Numbers problem, and polls until the result is final.

Required proof:

```json
{
  "status": "completed",
  "verdict": "accepted",
  "passedTests": 3,
  "totalTests": 3
}
```

## Important Caveat

These changes make runtime verification possible. They do not by themselves prove production readiness. The system is only verified after the end-to-end submission proof passes in the target environment.
