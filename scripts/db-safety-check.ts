#!/usr/bin/env tsx

/**
 * Database Safety Check Script
 * 
 * This script validates that dangerous database operations are not being
 * run against production databases. It should be run before any migration
 * or destructive database command.
 */

import { getDatabaseConfig, requireDestructiveOperationsAllowed } from '../src/lib/db-config';

interface SafetyCheckOptions {
  operation: string;
  allowProduction?: boolean;
  confirmationRequired?: boolean;
}

/**
 * Perform safety checks before database operations
 */
function performSafetyCheck(options: SafetyCheckOptions): void {
  const { operation, allowProduction = false, confirmationRequired = false } = options;
  
  console.log(`🔍 Running database safety check for operation: ${operation}`);
  
  try {
    const config = getDatabaseConfig();
    
    console.log(`📍 Environment: ${config.environment}`);
    console.log(`🔗 Database: ${config.url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    // Check if operation is allowed in production
    if (config.isProduction && !allowProduction) {
      console.error(`❌ BLOCKED: Operation "${operation}" is not allowed in production environment`);
      console.error(`   Use staging environment for this operation:`);
      console.error(`   DATABASE_ENV=staging npm run ${operation}`);
      process.exit(1);
    }
    
    // Check if destructive operations are allowed
    if (!config.allowDestructiveOperations && !allowProduction) {
      requireDestructiveOperationsAllowed(operation);
    }
    
    // Production operations require explicit confirmation
    if (config.isProduction && allowProduction) {
      console.warn(`⚠️  WARNING: You are about to run "${operation}" on PRODUCTION database!`);
      console.warn(`   Environment: ${config.environment}`);
      console.warn(`   Database: ${config.url.split('@')[1]?.split('/')[0] || 'unknown'}`);
      
      if (confirmationRequired) {
        // In a real implementation, you might want to require interactive confirmation
        // For now, we'll just log the warning
        console.warn(`   This operation should only be performed by authorized personnel`);
        console.warn(`   Make sure you have a recent backup before proceeding`);
      }
    }
    
    console.log(`✅ Safety check passed for operation: ${operation}`);
    
  } catch (error) {
    console.error(`❌ Safety check failed:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// CLI interface
const operation = process.argv[2];
const allowProduction = process.argv.includes('--allow-production');
const confirmationRequired = process.argv.includes('--require-confirmation');

if (!operation) {
  console.error('Usage: tsx scripts/db-safety-check.ts <operation> [--allow-production] [--require-confirmation]');
  console.error('');
  console.error('Examples:');
  console.error('  tsx scripts/db-safety-check.ts "migrate dev"');
  console.error('  tsx scripts/db-safety-check.ts "migrate deploy" --allow-production');
  console.error('  tsx scripts/db-safety-check.ts "db push" --require-confirmation');
  process.exit(1);
}

performSafetyCheck({
  operation,
  allowProduction,
  confirmationRequired,
});