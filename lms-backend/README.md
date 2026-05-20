# Codify LMS Backend

Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis, SQS, Lambda, and a separate compiler service for code execution.

## Architecture

```text
Vercel frontend
  -> API Gateway
  -> Lambda API (Express via serverless-http)
  -> RDS PostgreSQL / ElastiCache Redis / S3

Submission flow:
POST /api/submissions
  -> create Submission(status=pending)
  -> send SQS message
  -> Lambda SQS worker
  -> internal compiler service on Fargate
  -> update Submission result and Redis leaderboard
```

The backend API and worker are Lambda-based. The compiler remains a separate container service because running untrusted compilers directly in Lambda is not a good isolation boundary.

## Local Dev

```bash
npm install
npx prisma generate
npm run dev
```

Start the compiler in a second terminal:

```bash
npm run dev --prefix compiler-service
```

For local submissions, set `SQS_SUBMISSIONS_QUEUE_URL` to a real dev queue and run:

```bash
npm run worker
```

## Database

```bash
npm run prisma:migrate
```

Note: demo/mock seeding has been removed from this repository — there are no default users or problems created by `prisma db seed`. Create real users via your admin workflow or connect your production/dev seed process separately when needed.

## Checks

```bash
npm run type-check
npm run type-check --prefix compiler-service
npm test
```

## Environment

Copy `.env.example` to `.env` for local development. In production, inject these through Lambda environment variables backed by AWS Secrets Manager or CI secrets.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | Local Express port |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `COMPILER_SERVICE_URL` | Internal compiler service URL |
| `JWT_SECRET` | Access token signing secret |
| `JWT_EXPIRES_IN` | Access token lifetime, for example `15m` |
| `REFRESH_TOKEN_SECRET` | Refresh cookie signing secret |
| `DATABASE_URL` | RDS PostgreSQL connection string |
| `REDIS_URL` | ElastiCache Redis connection string |
| `AWS_REGION` | AWS region |
| `S3_BUCKET_NAME` | Upload bucket |
| `CLOUDFRONT_DOMAIN` | CDN domain for stored assets |
| `SQS_SUBMISSIONS_QUEUE_URL` | SQS queue used by submission workers |
| `BCRYPT_ROUNDS` | Password hash cost |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window |
| `RATE_LIMIT_MAX` | General request limit |
| `COMPILER_TIMEOUT_MS` | Compiler call timeout |
| `COMPILER_MEMORY_MB` | Compiler memory limit metadata |
| `COMPILER_RUNNER_*_URL` | Lambda function URLs for language-specific compiler runners |

## Deployment

`template.yaml` defines:

- API Gateway
- Lambda Express API
- SQS submissions queue with DLQ
- Lambda submission worker triggered by SQS
- VPC attachment for private RDS and ElastiCache access

`Dockerfile.compiler` builds the compiler service container for Fargate. The CI workflow deploys the SAM stack, builds the compiler image, pushes it to ECR, and forces a Fargate service deployment.

Compiler runner Lambdas are deployed separately from `compiler-service/lambda_compilers/compilers_clean` with their own SAM template and deploy script. The runner stack exports Function URLs that must be injected into the compiler service as `COMPILER_RUNNER_*_URL` variables.

Required deployment secrets also include `PRIVATE_SUBNET_IDS` and `LAMBDA_SECURITY_GROUP_IDS` as comma-delimited values for Lambda VPC access.
