import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getDatabaseConfig, getDatabaseEnvironment } from '../db-config';

const ENV_KEYS = [
  'NODE_ENV',
  'DATABASE_ENV',
  'VERCEL_ENV',
  'DATABASE_URL',
  'DIRECT_URL',
  'PRODUCTION_DATABASE_URL',
  'PRODUCTION_DIRECT_URL',
  'STAGING_DATABASE_URL',
  'STAGING_DIRECT_URL',
  'TEST_DATABASE_URL',
  'NEXT_PHASE',
] as const;

const PROD_URL = 'postgresql://prod:prod@prod-host:6543/postgres';
const STAGING_URL = 'postgresql://stg:stg@staging-host:6543/postgres';

function setEnv(key: string, value: string | undefined) {
  if (value === undefined)
    delete (process.env as Record<string, string | undefined>)[key];
  else (process.env as Record<string, string | undefined>)[key] = value;
}

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    setEnv(k, undefined);
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) setEnv(k, saved[k]);
});

describe('getDatabaseEnvironment', () => {
  it('returns test when NODE_ENV=test', () => {
    setEnv('NODE_ENV', 'test');
    expect(getDatabaseEnvironment()).toBe('test');
  });

  it('maps a Vercel PREVIEW deploy to staging (even though NODE_ENV=production)', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('VERCEL_ENV', 'preview');
    expect(getDatabaseEnvironment()).toBe('staging');
  });

  it('maps a Vercel PRODUCTION deploy to production', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('VERCEL_ENV', 'production');
    expect(getDatabaseEnvironment()).toBe('production');
  });

  it('honors an explicit DATABASE_ENV=staging override', () => {
    setEnv('DATABASE_ENV', 'staging');
    expect(getDatabaseEnvironment()).toBe('staging');
  });

  it('falls back to production for non-Vercel NODE_ENV=production', () => {
    setEnv('NODE_ENV', 'production');
    expect(getDatabaseEnvironment()).toBe('production');
  });

  it('defaults to development', () => {
    expect(getDatabaseEnvironment()).toBe('development');
  });
});

describe('getDatabaseConfig', () => {
  it('preview/staging resolves to STAGING_DATABASE_URL, never production', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('VERCEL_ENV', 'preview');
    setEnv('PRODUCTION_DATABASE_URL', PROD_URL);
    setEnv('STAGING_DATABASE_URL', STAGING_URL);

    const config = getDatabaseConfig();
    expect(config.environment).toBe('staging');
    expect(config.url).toBe(STAGING_URL);
    expect(config.isProduction).toBe(false);
  });

  it('production resolves to PRODUCTION_DATABASE_URL', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('VERCEL_ENV', 'production');
    setEnv('PRODUCTION_DATABASE_URL', PROD_URL);

    const config = getDatabaseConfig();
    expect(config.environment).toBe('production');
    expect(config.url).toBe(PROD_URL);
    expect(config.isProduction).toBe(true);
  });

  it('REFUSES to use the production DB in a non-prod environment (safety net)', () => {
    // A mis-scoped DATABASE_URL that equals the prod URL on a preview deploy.
    setEnv('NODE_ENV', 'production');
    setEnv('VERCEL_ENV', 'preview');
    setEnv('PRODUCTION_DATABASE_URL', PROD_URL);
    setEnv('DATABASE_URL', PROD_URL); // no STAGING_DATABASE_URL -> would fall back to this

    expect(() => getDatabaseConfig()).toThrow(/production database/i);
  });

  it('does NOT throw during next build even if the url resolves to prod (no queries run at build)', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('VERCEL_ENV', 'preview');
    setEnv('NEXT_PHASE', 'phase-production-build');
    setEnv('PRODUCTION_DATABASE_URL', PROD_URL);
    setEnv('DATABASE_URL', PROD_URL);

    expect(() => getDatabaseConfig()).not.toThrow();
  });

  it('allows a preview deploy whose DATABASE_URL is staging (not prod)', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('VERCEL_ENV', 'preview');
    setEnv('PRODUCTION_DATABASE_URL', PROD_URL);
    setEnv('DATABASE_URL', STAGING_URL);

    expect(() => getDatabaseConfig()).not.toThrow();
    expect(getDatabaseConfig().url).toBe(STAGING_URL);
  });
});
