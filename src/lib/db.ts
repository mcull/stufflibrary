import { PrismaClient } from '@prisma/client';

import { getDatabaseConfig, logDatabaseConfig } from './db-config';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Get database configuration
const dbConfig = getDatabaseConfig();

// Log database configuration in development
if (env.NODE_ENV === 'development') {
  logDatabaseConfig();
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: dbConfig.environment === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    datasources: {
      db: {
        url: dbConfig.url,
      },
    },
  });

// Only cache in non-production environments to allow environment switching
if (!dbConfig.isProduction) {
  globalForPrisma.prisma = db;
}

// Export configuration for use by other modules
export { dbConfig };
