import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().optional(),

  // Cache
  REDIS_URL: z.string().optional(),

  // AI Services
  OPENAI_API_KEY: z.string().optional(),

  // File Storage (Wasabi S3)
  WASABI_ACCESS_KEY_ID: z.string().optional(),
  WASABI_SECRET_ACCESS_KEY: z.string().optional(),
  WASABI_REGION: z.string().optional(),
  WASABI_BUCKET: z.string().optional(),
  WASABI_ENDPOINT: z.string().optional(),

  // Authentication (Future)
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),

  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),

  // Development/Debug
  DEBUG: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    throw new Error('Environment validation failed');
  }
}

export const env = validateEnv();
