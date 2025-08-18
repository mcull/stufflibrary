import { z } from 'zod';

const envSchema = z.object({
  // Database (Supabase)
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Cache (Upstash Redis)
  KV_URL: z.string().optional(),
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  KV_REST_API_READ_ONLY_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // AI Services
  OPENAI_API_KEY: z.string().optional(),

  // File Storage (Vercel Blob)
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  BLOB_BASE_URL: z.string().url().optional(),
  BLOB_UNIQUE_STORE_ID: z.string().optional(),
  BLOB_STORE_NAME: z.string().optional(),

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

let _env: Env | null = null;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    throw new Error('Environment validation failed');
  }
}

export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

// For backwards compatibility
export const env = new Proxy({} as Env, {
  get(target, prop) {
    return getEnv()[prop as keyof Env];
  },
});
