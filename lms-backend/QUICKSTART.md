# LMS Backend Quickstart

This guide proves the local submission pipeline at runtime. Passing build, lint, and unit tests is useful, but it is not proof that Postgres, SQS, the worker, and the compiler are connected correctly.

## Target Proof

The runtime proof is:

```json
{
  "status": "completed",
  "verdict": "accepted",
  "passedTests": 3,
  "totalTests": 3
}
```

The flow being tested is:

```text
Express API -> Postgres -> ElasticMQ SQS queue -> worker -> Docker compiler service -> Postgres result update
```

## Prerequisites

- Node.js 20.15.0 (see repo `.nvmrc` / `docs/toolchain-versions.md`)
- Docker Desktop
- npm dependencies installed with `npm install`

## Environment

For local verification, `.env` should include:

```env
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,https://lms-ui-hjb5.vercel.app
COMPILER_SERVICE_URL=http://localhost:4000

JWT_SECRET=dev-jwt-secret-please-change-this-32chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=dev-refresh-secret-please-change-this-32chars

DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/lms
REDIS_URL=redis://localhost:6379

AWS_REGION=ap-south-1
S3_BUCKET_NAME=lms-assets
CLOUDFRONT_DOMAIN=https://cdn.yourdomain.com
SQS_ENDPOINT=http://localhost:9324
SQS_SUBMISSIONS_QUEUE_URL=http://localhost:9324/000000000000/submissions

BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
COMPILER_TIMEOUT_MS=8000
COMPILER_MEMORY_MB=128
COMPILER_MAX_OUTPUT_BYTES=65536
SUBMISSION_CODE_MAX_BYTES=65536
RUNNER_UID=10001
```

## Start Local Dependencies

```powershell
docker compose -f docker-compose.dev.yml up -d
npm run prisma:push
npm run prisma:seed
```

The seed creates:

```text
student1@codify.com / Student@123
problem: 33333333-3333-3333-3333-333333333333 (Sum Two Numbers, 3 test cases)
```

## Start Compiler

Run the compiler through Docker so execution uses the Linux sandbox path expected by the service:

```powershell
npm run build:compiler
docker build -f Dockerfile.compiler -t lms-compiler .
docker run --rm -p 4000:4000 lms-compiler
```

Quick compiler check:

```powershell
curl http://localhost:4000/health
```

Expected:

```json
{ "status": "ok" }
```

The compiler execute body uses `timeoutMs` and `memoryMb`:

```powershell
curl -X POST http://localhost:4000/execute `
  -H "Content-Type: application/json" `
  -d '{ "language": "python", "code": "print(\"hello\")", "stdin": "", "timeoutMs": 1000, "memoryMb": 128 }'
```

## Start Backend and Worker

Terminal 1:

```powershell
npm run dev
```

Terminal 2:

```powershell
npm run worker
```

Health must show every dependency as `ok`:

```powershell
curl http://localhost:3000/health
```

Expected shape:

```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "sqs": "ok",
  "uptime": 2.3
}
```

## Run Runtime Proof

With Docker dependencies, compiler, backend, and worker running:

```powershell
npm run verify:submission-flow
```

The script:

1. Checks compiler health.
2. Checks API dependency health.
3. Logs in with `POST /api/auth/login`.
4. Submits a Python solution to the seeded Sum Two Numbers problem.
5. Polls `GET /api/submissions/:id`.
6. Fails if the submission is stuck, failed, or not accepted.

Expected final output:

```json
{
  "status": "completed",
  "verdict": "accepted",
  "passedTests": 3,
  "totalTests": 3
}
```

## Manual API Smoke Test

Login:

```powershell
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{ "email": "student1@codify.com", "password": "Student@123" }'
```

Submit:

```powershell
curl -X POST http://localhost:3000/api/submissions `
  -H "Authorization: Bearer <access-token>" `
  -H "Content-Type: application/json" `
  -d '{ "problemId": "33333333-3333-3333-3333-333333333333", "language": "python", "code": "import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)" }'
```

Poll:

```powershell
curl http://localhost:3000/api/submissions/<submission-id> `
  -H "Authorization: Bearer <access-token>"
```

## Failure Checks

- Wrong answer: submit code that prints a fixed wrong value and confirm `verdict` becomes `wrong_answer`.
- Compiler unavailable: stop the compiler, submit once, and confirm worker logs the compiler failure and the submission becomes `failed`.
- Queue unavailable: stop ElasticMQ and confirm `/health` returns `"sqs": "error"`.

There is no local BullMQ fallback in the current code path. Local verification uses ElasticMQ as an SQS-compatible queue.
