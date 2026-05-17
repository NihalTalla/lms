# Deployment Readiness Runbook

This project is **deployment-ready in stages**, not as a single big bang. The goal is to preserve the working async flow while moving carefully from local proof to AWS rollout.

## Non-negotiables

- Do not add new features during rollout.
- Keep the submission flow, queueing, compiler isolation, and request tracing stable.
- Treat every AWS change as a production-risk change until it is rehearsed.

## Stage 0 — Local runtime proof

Before any AWS work, confirm the local end-to-end submission path still passes:

```powershell
npm run verify:submission-flow
```

Required result:

```json
{
  "status": "completed",
  "verdict": "accepted",
  "passedTests": 3,
  "totalTests": 3
}
```

Also confirm the failure cases still behave correctly:

- duplicate submits trigger rate limiting or are blocked in the UI
- compiler unavailable returns a graceful failure
- `while True` produces `time_limit_exceeded`
- syntax/runtime crashes produce `runtime_error`
- worker restart resumes pending submissions

## Stage 1 — Core AWS infrastructure

Provision and verify these first:

- PostgreSQL on RDS
- Redis on ElastiCache
- S3 for uploads/assets
- SQS submissions queue plus DLQ
- Secrets Manager for environment secrets
- VPC, private subnets, and security groups
- IAM roles and least-privilege permissions

### Acceptance criteria

- API can reach RDS and ElastiCache from the VPC.
- API can send messages to the submissions queue.
- Worker can receive/delete messages from the queue.
- Queue has a dead-letter path.

## Stage 2 — Application compute

Deploy the compute pieces using the current architecture:

- Lambda API for HTTP traffic
- Lambda submission worker for queue processing
- isolated compiler service behind the `CompilerServiceUrl` parameter

### Important note

The codebase currently expects the compiler to be an isolated service, not an in-Lambda execution runtime. Keep that boundary intact unless there is a deliberate architecture change later.

### Acceptance criteria

- `/health` reports `db`, `redis`, and `sqs` as `ok`
- login succeeds in production
- submissions are created and queued
- the worker processes at least one real submission in AWS
- compiler calls succeed from the worker network path

### Compiler runner deployment

Use the dedicated SAM stack in `compiler-service/lambda_compilers/compilers_clean` to deploy the language runners. The stack is parameterized for timeout/memory tuning and exposes Function URLs for:

- Python runner
- Java runner
- C++ runner
- C runner

The compiler service should read these URLs from its production environment:

- `COMPILER_RUNNER_PYTHON_URL`
- `COMPILER_RUNNER_JAVA_URL`
- `COMPILER_RUNNER_CPP_URL`
- `COMPILER_RUNNER_C_URL`

The runner handlers clamp `timeoutMs` to the configured min/max bounds and return `TIME_LIMIT_EXCEEDED` when the code runs too long.

## Stage 3 — Monitoring and operations

Add observability before opening the system up broadly:

- request IDs in logs
- submission IDs in logs
- compiler execution timing
- queue latency / backlog
- failure counts by category
- DLQ alarm
- API 5xx alarm
- worker failure alarm

### Minimum useful dashboards

- submissions by status: queued, running, completed, failed
- verdict breakdown: accepted, wrong_answer, time_limit_exceeded, runtime_error
- compiler latency and timeout rate
- SQS queue depth and DLQ depth

## Environment split

### Local development

Local development may use ElasticMQ and localhost services:

```env
SQS_ENDPOINT=http://127.0.0.1:9324
SQS_SUBMISSIONS_QUEUE_URL=http://127.0.0.1:9324/000000000000/submissions
```

### AWS deployment

For AWS, omit `SQS_ENDPOINT` and use the real queue URL:

```env
SQS_SUBMISSIONS_QUEUE_URL=https://sqs.<region>.amazonaws.com/<account-id>/<queue-name>
```

Inject production secrets through AWS Secrets Manager or CI/CD secret storage:

- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- any storage/CDN settings used by the backend

## Fresh-machine rehearsal

Run one clean setup before the real rollout. This is the easiest way to catch missing assumptions.

### Rehearsal checklist

- clone the repo on a fresh machine or clean workspace
- install dependencies
- generate Prisma client
- provision local/dev dependencies or point to AWS dev resources
- start backend, worker, and compiler service
- run the local submission proof
- confirm auth, submit, poll, and failure cases work

### Success criteria

- setup steps are reproducible without tribal knowledge
- no missing env vars
- no startup race conditions
- migrations and seed order are clear
- smoke test passes immediately after setup

## Rollout order

1. Freeze feature work.
2. Rehearse setup on a clean environment.
3. Deploy core infra.
4. Deploy compute.
5. Verify monitoring.
6. Run a production smoke test.
7. Only then consider broader rollout.

## Current status

The platform is now in **deployment engineering** mode:

- architecture is validated
- failure behavior is validated
- observability is improving
- the main remaining risk is operational consistency

That is the right place to be before AWS rollout.

For the concrete production gate checklist, see `PRODUCTION_LAUNCH_CHECKLIST.md`.
