# Final Launch Checklist

Before promoting staging -> production, verify the following:

- [ ] Staging stack deployed and healthy (all CloudFormation resources CREATE_COMPLETE/UPDATE_COMPLETE)
- [ ] CloudWatch dashboard present and showing metrics (Lambda duration, SQS depth, DB/Cache CPU)
- [ ] Alarms configured and SNS notifications validated
- [ ] Secrets stored in AWS Secrets Manager and referenced by stack parameters
- [ ] Toolchain versions pinned and verified (Node, SAM, AWS CLI)
- [ ] IAM roles reviewed for least-privilege (Lambda, ECS, CloudFormation)
- [ ] `verify:production-launch` completes successfully in staging
- [ ] Load tests pass (acceptable latency and success rate)
- [ ] Chaos tests executed and system recovers gracefully
- [ ] Cost estimate reviewed and budget alerts configured
- [ ] AWS Budgets configured for monthly spend caps
- [ ] Rollback plan documented and validated (able to restore previous stack)
- [ ] Stakeholder sign-off obtained

Once all items are green, schedule production promotion and follow the same steps with production-specific parameters and a maintenance window.
