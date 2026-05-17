# LMS Backend Runtime Status

## Current Status

The backend is ready for local runtime verification. It should not be described as production ready until the submission flow has been proven against real or local-equivalent dependencies.

## What Is Known

- Type-check, build, lint, and unit tests can validate code quality.
- The current unit test coverage is small and does not prove the submission pipeline.
- Runtime proof requires Postgres, Redis, SQS-compatible queue, worker, and compiler service to all run together.

## Required Runtime Proof

Run:

```powershell
docker compose -f docker-compose.dev.yml up -d
npm run prisma:push
npm run prisma:seed
npm run dev
npm run worker
npm run verify:submission-flow
```

The proof is successful only when the verifier prints:

```json
{
  "status": "completed",
  "verdict": "accepted",
  "passedTests": 3,
  "totalTests": 3
}
```

## Health Expectations

`GET /health` must show:

```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "sqs": "ok"
}
```

If any dependency is `error`, the backend is not runtime verified.
