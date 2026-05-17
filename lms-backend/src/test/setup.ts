process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3001';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173';
process.env.COMPILER_SERVICE_URL = process.env.COMPILER_SERVICE_URL ?? 'http://localhost:4000';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret-test';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
process.env.REFRESH_TOKEN_SECRET =
	process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-secret-test-refresh-secret-test';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

process.env.AWS_REGION = process.env.AWS_REGION ?? 'ap-south-1';
process.env.S3_BUCKET_NAME = process.env.S3_BUCKET_NAME ?? 'test-bucket';
process.env.CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN ?? 'https://cdn.example.com';
process.env.SQS_SUBMISSIONS_QUEUE_URL =
	process.env.SQS_SUBMISSIONS_QUEUE_URL ??
	'https://sqs.ap-south-1.amazonaws.com/000000000000/lms-submissions-test';

process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ?? '12';
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ?? '60000';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ?? '100';
process.env.COMPILER_TIMEOUT_MS = process.env.COMPILER_TIMEOUT_MS ?? '8000';
process.env.COMPILER_MEMORY_MB = process.env.COMPILER_MEMORY_MB ?? '128';

process.env.RUNNER_UID = process.env.RUNNER_UID ?? '10001';
