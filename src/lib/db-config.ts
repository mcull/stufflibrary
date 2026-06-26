// Note: env import removed to avoid unused variable lint error

/**
 * Database Configuration Manager
 *
 * Provides environment-specific database configuration with safety checks
 * to prevent accidental operations on production data.
 */

export type DatabaseEnvironment =
  | 'development'
  | 'staging'
  | 'production'
  | 'test';

export interface DatabaseConfig {
  url: string;
  directUrl: string | undefined;
  environment: DatabaseEnvironment;
  isProduction: boolean;
  allowDestructiveOperations: boolean;
}

/**
 * Get the current database environment
 */
export function getDatabaseEnvironment(): DatabaseEnvironment {
  // Test always wins.
  if (process.env.NODE_ENV === 'test' || process.env.DATABASE_ENV === 'test') {
    return 'test';
  }

  // Explicit override via DATABASE_ENV (used by the db:* CLI scripts).
  const explicit = process.env.DATABASE_ENV;
  if (explicit === 'staging') return 'staging';
  if (explicit === 'production') return 'production';
  if (explicit === 'development') return 'development';

  // Infer from the Vercel deployment context. NODE_ENV is 'production' for BOTH
  // production and preview builds, so it cannot tell them apart — VERCEL_ENV
  // can. Preview deploys must use staging, never the production database.
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'preview') return 'staging';
  if (vercelEnv === 'production') return 'production';

  // Non-Vercel fallback (e.g. a self-hosted prod process).
  if (process.env.NODE_ENV === 'production') return 'production';

  // Default to development (local database).
  return 'development';
}

/**
 * Get database configuration for the current environment
 */
export function getDatabaseConfig(): DatabaseConfig {
  const environment = getDatabaseEnvironment();

  // During build time, some API routes may be evaluated but we don't need real DB access
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

  let config: DatabaseConfig;

  switch (environment) {
    case 'production': {
      // Use PRODUCTION_DATABASE_URL in production, fallback to DATABASE_URL for backward compatibility
      const prodUrl =
        process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;
      if (!prodUrl && !isBuildTime) {
        throw new Error(
          'PRODUCTION_DATABASE_URL (or DATABASE_URL) is required for production environment'
        );
      }
      config = {
        url: prodUrl || 'postgresql://placeholder@localhost/placeholder',
        directUrl: process.env.PRODUCTION_DIRECT_URL || process.env.DIRECT_URL,
        environment: 'production',
        isProduction: true,
        allowDestructiveOperations: false,
      };
      break;
    }

    case 'staging': {
      // Preview / staging deploys. Prefer STAGING_*; never reach for the
      // PRODUCTION_* vars. The safety net below enforces this even if a
      // DATABASE_URL fallback is mis-scoped to the production database.
      const stagingUrl =
        process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
      if (!stagingUrl && !isBuildTime) {
        throw new Error(
          'STAGING_DATABASE_URL (or DATABASE_URL) is required for staging environment'
        );
      }
      config = {
        url: stagingUrl || 'postgresql://placeholder@localhost/placeholder',
        directUrl: process.env.STAGING_DIRECT_URL || process.env.DIRECT_URL,
        environment: 'staging',
        isProduction: false,
        allowDestructiveOperations: true,
      };
      break;
    }

    case 'test': {
      // Use test database URL if available, otherwise fall back to development
      const testUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
      if (!testUrl) {
        throw new Error(
          'TEST_DATABASE_URL or DATABASE_URL is required for test environment'
        );
      }
      config = {
        url: testUrl,
        directUrl: process.env.TEST_DIRECT_URL || process.env.DIRECT_URL,
        environment: 'test',
        isProduction: false,
        allowDestructiveOperations: true,
      };
      break;
    }

    case 'development':
    default: {
      // Development uses local database (Docker or local PostgreSQL)
      if (!process.env.DATABASE_URL) {
        throw new Error(
          'DATABASE_URL is required for development environment (use local database)'
        );
      }
      config = {
        url: process.env.DATABASE_URL,
        directUrl: process.env.DIRECT_URL,
        environment: 'development',
        isProduction: false,
        allowDestructiveOperations: true,
      };
      break;
    }
  }

  // Safety net: a non-production environment must NEVER resolve to the
  // production database. This catches a DATABASE_URL that was mis-scoped to the
  // prod connection string on a preview/staging deploy — fail loud instead of
  // silently reading/writing production data.
  if (
    config.environment !== 'production' &&
    process.env.PRODUCTION_DATABASE_URL &&
    config.url === process.env.PRODUCTION_DATABASE_URL
  ) {
    throw new Error(
      `Refusing to use the production database in the '${config.environment}' environment. ` +
        `Set STAGING_DATABASE_URL (or a non-prod DATABASE_URL) for this environment.`
    );
  }

  return config;
}

/**
 * Check if destructive database operations are allowed
 * This prevents accidental data loss in production
 */
export function areDestructiveOperationsAllowed(): boolean {
  const config = getDatabaseConfig();
  return config.allowDestructiveOperations;
}

/**
 * Throw an error if destructive operations are not allowed
 * Use this as a safety check before running dangerous migrations
 */
export function requireDestructiveOperationsAllowed(operation: string): void {
  if (!areDestructiveOperationsAllowed()) {
    const env = getDatabaseEnvironment();
    throw new Error(
      `Destructive operation "${operation}" is not allowed in ${env} environment. ` +
        `Use staging or development environment for this operation.`
    );
  }
}

/**
 * Log database configuration (without sensitive data)
 */
export function logDatabaseConfig(): void {
  const config = getDatabaseConfig();
  console.log(`Database Environment: ${config.environment}`);
  console.log(`Production Mode: ${config.isProduction}`);
  console.log(
    `Destructive Operations Allowed: ${config.allowDestructiveOperations}`
  );
  console.log(
    `Database URL: ${config.url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`
  );
}

// Note: Don't export databaseConfig as a constant to avoid module-load-time issues
// Instead, call getDatabaseConfig() when you need the configuration
