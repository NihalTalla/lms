# Backend Fixes and Runtime Verification Guide

## What Changed

- Database startup now retries with clearer Prisma connection logs.
- Environment variables are validated at startup.
- Submission creation logs the API, DB, and SQS enqueue stages.
- The SQS client can target a local ElasticMQ endpoint through `SQS_ENDPOINT`.
- `/health` checks the configured submission queue with `GetQueueAttributesCommand`.
- Worker processing is idempotent and skips submissions that are no longer `pending`.
- Compiler responses are validated before verdict mapping.
- `npm run verify:submission-flow` performs a real local happy-path submission.

## What This Proves

Static checks prove the code compiles. They do not prove the system works at runtime.

Runtime proof requires:

```text
Express API -> Postgres -> ElasticMQ SQS queue -> worker -> Docker compiler service -> Postgres result update
```

## Local Verification

Start dependencies:

```powershell
docker compose -f docker-compose.dev.yml up -d
npm run prisma:push
npm run prisma:seed
```

Start compiler, backend, and worker:

```powershell
npm run build:compiler
docker build -f Dockerfile.compiler -t lms-compiler .
docker run --rm -p 4000:4000 lms-compiler
npm run dev
npm run worker
```

Run proof:

```powershell
npm run verify:submission-flow
```

Expected proof result:

```json
{
  "status": "completed",
  "verdict": "accepted",
  "passedTests": 3,
  "totalTests": 3
}
```

## API Details

Login endpoint:

```text
POST /api/auth/login
```

Submission endpoint:

```text
POST /api/submissions
```

Submission response:

```json
{
  "submissionId": "uuid",
  "status": "pending"
}
```

Result endpoint:

```text
GET /api/submissions/:id
```

## Local Queue

The current local flow uses ElasticMQ as an SQS-compatible queue. There is no BullMQ fallback in the active submission code path.

Use:

```env
SQS_ENDPOINT=http://localhost:9324
SQS_SUBMISSIONS_QUEUE_URL=http://localhost:9324/000000000000/submissions
```

## Status Language

Use "ready for runtime verification" until the verifier passes in the target environment. Use "production ready" only after the same end-to-end flow has been proven with production-equivalent infrastructure, permissions, logs, and monitoring.
