# Staging Deploy & Verify Runbook

This runbook documents the steps to provision a staging environment and run the automated launch gate (`verify:production-launch`) against it.

Prerequisites
- AWS account and an S3 bucket to hold packaged CloudFormation templates.
- AWS credentials configured (for local or CI usage).
- Toolchain pinned (see `docs/toolchain-versions.md`).

Quick deploy (local)

1. Export environment variables (example):

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-west-2
export S3_BUCKET=my-staging-artifacts-bucket
export STACK_NAME=lms-staging
export PARAMETER_OVERRIDES="DatabaseName=lms-staging DatabaseUser=admin"
```

2. Package & deploy (uses `lms-backend/template.yaml`):

```bash
./scripts/deploy-staging.sh
```

3. After deploy completes, create or import CloudWatch dashboard and alarms:

```bash
aws cloudwatch put-dashboard --dashboard-name lms-staging-dashboard --dashboard-body file://infra/staging/cloudwatch-dashboard.json
aws cloudformation deploy --template-file infra/staging/alarms.yaml --stack-name lms-staging-alarms --capabilities CAPABILITY_NAMED_IAM
aws cloudformation deploy --template-file infra/staging/secrets-manager.yaml --stack-name lms-staging-secrets --capabilities CAPABILITY_NAMED_IAM
```

4. Configure cost budgets (replace values with your staging limits/email):

```bash
aws cloudformation deploy --template-file infra/staging/budgets.yaml --stack-name lms-staging-budgets --parameter-overrides MonthlyBudgetAmount=200 NotificationEmail=ops@example.com
```

Run the launch gate (verify)

1. Set runtime endpoints for the staging services (example):

```bash
export VITE_API_BASE_URL=https://api-staging.example.com
export VITE_COMPILER_URL=https://compiler-staging.example.com
```

2. Run the same verify gate used for production verification from the repo root:

```bash
npm --prefix lms-backend run verify:production-launch
```

Notes
- The verify script expects seeded data (see `prisma/seed.ts`); ensure seed run after DB created.
- If any task requires sensitive values (DB passwords, JWT secrets), inject them via Secrets Manager and pass ARNs as parameters to the stack.
