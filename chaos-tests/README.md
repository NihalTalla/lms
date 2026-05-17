Chaos & Load Tests (staging)

These scripts and instructions exercise concurrency and failure modes in a staging environment.

Load test
- Use the existing `lms-backend/scripts/load-test-submissions.ts`. Run it after setting `VITE_API_BASE_URL` to your staging API.

Chaos tests
- Use `lms-backend/scripts/submission-edgecases.ts` and `compiler-failure-test.ts` to exercise compiler unavailability and edge-case submissions.

Example (run from repo root):

```bash
export VITE_API_BASE_URL=https://api-staging.example.com
node --loader ts-node/esm lms-backend/scripts/load-test-submissions.ts
```

Safety
- Run chaos tests in a dedicated staging account with cost limits and monitoring.
