import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const envSchema = z.object({
  // Database (Supabase)
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  
  // Staging Database
  STAGING_DATABASE_URL: z.string().url().optional(),
  STAGING_DIRECT_URL: z.string().url().optional(),
  
  // Test Database
  TEST_DATABASE_URL: z.string().url().optional(),
  TEST_DIRECT_URL: z.string().url().optional(),
  
  // Database Environment Override
  DATABASE_ENV: z.enum(['development', 'staging', 'production', 'test']).optional(),

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

  // Authentication
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

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
  // Skip validation during build time
  if (process.env.NODE_ENV === undefined) {
    // Return minimal env for build time
    return {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      DEBUG: false,
      LOG_LEVEL: 'info',
    } as Env;
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    // During build time, return defaults if validation fails
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn('⚠️ Using default environment values during build');
      return {
        NODE_ENV:
          (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
          'production',
        NEXT_PUBLIC_APP_URL:
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        DEBUG: false,
        LOG_LEVEL: 'info',
      } as Env;
    }

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
