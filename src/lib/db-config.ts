import { env } from './env';

/**
 * Database Configuration Manager
 * 
 * Provides environment-specific database configuration with safety checks
 * to prevent accidental operations on production data.
 */

export type DatabaseEnvironment = 'development' | 'staging' | 'production' | 'test';

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
  // Explicitly check for staging environment
  if (process.env.DATABASE_ENV === 'staging') {
    return 'staging';
  }
  
  // Check for test environment
  if (process.env.NODE_ENV === 'test' || process.env.DATABASE_ENV === 'test') {
    return 'test';
  }
  
  // Check for production
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_ENV === 'production') {
    return 'production';
  }
  
  // Default to development
  return 'development';
}

/**
 * Get database configuration for the current environment
 */
export function getDatabaseConfig(): DatabaseConfig {
  const environment = getDatabaseEnvironment();
  
  switch (environment) {
    case 'production':
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required for production environment');
      }
      return {
        url: process.env.DATABASE_URL,
        directUrl: process.env.DIRECT_URL,
        environment: 'production',
        isProduction: true,
        allowDestructiveOperations: false,
      };
      
    case 'staging':
      if (!process.env.STAGING_DATABASE_URL) {
        throw new Error('STAGING_DATABASE_URL is required for staging environment');
      }
      return {
        url: process.env.STAGING_DATABASE_URL,
        directUrl: process.env.STAGING_DIRECT_URL,
        environment: 'staging',
        isProduction: false,
        allowDestructiveOperations: true,
      };
      
    case 'test':
      // Use test database URL if available, otherwise fall back to development
      const testUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
      if (!testUrl) {
        throw new Error('TEST_DATABASE_URL or DATABASE_URL is required for test environment');
      }
      return {
        url: testUrl,
        directUrl: process.env.TEST_DIRECT_URL || process.env.DIRECT_URL,
        environment: 'test',
        isProduction: false,
        allowDestructiveOperations: true,
      };
      
    case 'development':
    default:
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required for development environment');
      }
      return {
        url: process.env.DATABASE_URL,
        directUrl: process.env.DIRECT_URL,
        environment: 'development',
        isProduction: false,
        allowDestructiveOperations: true,
      };
  }
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
  console.log(`Destructive Operations Allowed: ${config.allowDestructiveOperations}`);
  console.log(`Database URL: ${config.url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
}

// Export configuration for use in Prisma schema
export const databaseConfig = getDatabaseConfig();