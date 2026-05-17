# Rollback Runbook (staging)

If a staging deploy causes regressions or failures, follow these steps to rollback safely.

1. Identify the last known-good CloudFormation deployment from the CloudFormation console (look for previous successful stack events).
2. Use the console to perform a stack update with the previous template or parameters, or use the CLI:

```bash
aws cloudformation deploy --template-file packaged-staging.yaml --stack-name lms-staging --capabilities CAPABILITY_NAMED_IAM --parameter-overrides Key=Value
```

3. If the stack is irrecoverable, you can restore from snapshot/backups for RDS and restore ElastiCache from snapshot.
4. Re-seed DB if necessary using existing `prisma/seed.ts` (run in a maintenance window):

```bash
npm --prefix lms-backend run prisma:seed
```

5. Notify stakeholders and run `verify:production-launch` again after rollback to validate system health.
