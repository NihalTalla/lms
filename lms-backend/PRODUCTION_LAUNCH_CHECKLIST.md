# Production Launch Checklist

This checklist turns the deployment plan into a repeatable, sequential process.

## Workstream A — AWS rollout

- [ ] RDS PostgreSQL created and reachable from the backend VPC
- [ ] ElastiCache Redis created and reachable from the backend VPC
- [ ] S3 bucket created for asset/storage use
- [ ] SQS submissions queue + DLQ created
- [ ] Lambda API deployed with the correct VPC/security-group settings
- [ ] Lambda worker deployed and subscribed to the submissions queue
- [ ] Compiler runners SAM stack deployed
- [ ] Compiler service environment points at runner Function URLs
- [ ] Production secrets are stored in Secrets Manager/CI secrets
- [ ] Production `.env` values are versioned and documented

## Workstream B — Observability

- [ ] `x-request-id` is propagated across browser → API → worker → compiler
- [ ] Submission IDs are included in logs
- [ ] Queue depth is visible in a dashboard
- [ ] Queue backlog alarm is configured
- [ ] Lambda timeout alarm is configured
- [ ] API 5xx alarm is configured
- [ ] Submission status counts are visible
- [ ] Compiler duration / timeout rate is visible

## Workstream C — Security and hardening

- [ ] Helmet is enabled in production
- [ ] CORS whitelist is restricted to known origins
- [ ] JWT expiration is intentional and documented
- [ ] Refresh token rotation strategy is defined
- [ ] Input validation is enforced on all submission/auth endpoints
- [ ] Compiler timeout bounds are configured
- [ ] File cleanup is guaranteed for compiler runs
- [ ] Temporary execution artifacts are removed

## Workstream D — Load and recovery testing

- [ ] Fresh-machine setup succeeds
- [ ] Local runtime proof passes
- [ ] AWS smoke test passes
- [ ] Concurrent submissions survive load
- [ ] Worker restart recovers pending submissions
- [ ] Compiler outage degrades gracefully
- [ ] DB reconnect / startup validation works
- [ ] Rollback procedure has been rehearsed

## Commands to run before launch

```powershell
npm run type-check
npm test
npm run verify:submission-flow
npm run test:load
```

## Launch gate

Do not ship until:

- all four workstreams are checked off
- smoke test passes
- load test passes
- rollback path is documented
