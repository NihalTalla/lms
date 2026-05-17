# Toolchain Versions (Pinned)

These versions are pinned to reduce deployment drift. Update them intentionally and keep CI/CD aligned.

- Node.js: 20.15.0 (see `.nvmrc` and `.tool-versions`)
- Prisma: 5.16.0 (see `lms-backend/package.json`)
- AWS CLI: 2.15.0 (see `.tool-versions`)
- AWS SAM CLI: 1.120.0 (see `.tool-versions`)
- Docker base images:
  - `lms-backend/Dockerfile`: `node:20-bookworm-slim`
  - `lms-backend/Dockerfile.compiler`: `node:20-bookworm-slim`

Notes
- If you update these versions, update CI workflows and verify with `verify:production-launch`.
