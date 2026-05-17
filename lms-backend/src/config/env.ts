import { z } from 'zod';

const roleSchema = z.enum(['student', 'faculty', 'trainer', 'admin']);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65535),

    // Frontend
    ALLOWED_ORIGINS: z
      .string()
      .min(1)
      .transform((value) =>
        value
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      ),

    // Services
    COMPILER_SERVICE_URL: z.string().min(1),

    // Auth
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().min(1),
    REFRESH_TOKEN_SECRET: z.string().min(32),

    // DB
    DATABASE_URL: z.string().min(1),

    // Redis
    REDIS_URL: z.string().min(1),

    // AWS
    AWS_REGION: z.string().min(1),
    S3_BUCKET_NAME: z.string().min(1),
    CLOUDFRONT_DOMAIN: z.string().min(1),
    SQS_SUBMISSIONS_QUEUE_URL: z.string().url(),
    SQS_ENDPOINT: z.string().url().optional(),

    // Security
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1),

    COMPILER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(15000),
    COMPILER_MEMORY_MB: z.coerce.number().int().min(64).max(1024),
    COMPILER_MAX_OUTPUT_BYTES: z.coerce.number().int().min(1024).max(262144).default(65536),
    SUBMISSION_CODE_MAX_BYTES: z.coerce.number().int().min(1024).max(262144).default(65536),

    // Runner/worker settings
    RUNNER_UID: z.coerce.number().int().min(1).optional()
  });

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues
    .filter((i) => i.code === 'invalid_type' && i.received === 'undefined')
    .map((i) => i.path.join('.'));

  // eslint-disable-next-line no-console
  console.error('[env] ❌ STARTUP FAILED: Missing required environment variables:');
  for (const name of missing) {
    // eslint-disable-next-line no-console
    console.error(`  - ${name}`);
  }

  // eslint-disable-next-line no-console
  console.error('\n[env] Use .env.example as template: cp .env.example .env');
  // eslint-disable-next-line no-console
  console.error('[env] All validation issues:', parsed.error.flatten());

  process.exit(1);
}

export const env = parsed.data;

// Re-export runtime enums that are used across the app.
export const roleEnum = roleSchema;
