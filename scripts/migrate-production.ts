#!/usr/bin/env tsx

/**
 * Production Migration Script
 * 
 * This script safely deploys database migrations to production.
 * It includes all necessary safety checks and logging.
 */

import { execSync } from 'child_process';
import { getDatabaseConfig, requireDestructiveOperationsAllowed } from '../src/lib/db-config';

interface MigrationOptions {
  dryRun?: boolean;
  skipBackup?: boolean;
  force?: boolean;
}

/**
 * Run production migration with safety checks
 */
async function runProductionMigration(options: MigrationOptions = {}) {
  const { dryRun = false, skipBackup = false, force = false } = options;
  
  console.log('🚀 Starting production migration process...\n');
  
  try {
    // Verify environment
    console.log('1. Verifying environment...');
    const config = getDatabaseConfig();
    
    if (config.environment !== 'production') {
      throw new Error(`Expected production environment, got: ${config.environment}`);
    }
    
    console.log(`   ✅ Environment: ${config.environment}`);
    console.log(`   ✅ Database: ${config.url.split('@')[1]?.split('/')[0] || 'unknown'}\n`);
    
    // Check migration status
    console.log('2. Checking migration status...');
    const statusOutput = execSync('npx prisma migrate status', { 
      encoding: 'utf8',
      env: { ...process.env, DATABASE_ENV: 'production' }
    });
    
    console.log(statusOutput);
    
    if (statusOutput.includes('No pending migrations')) {
      console.log('✅ Database is already up to date. No migrations needed.\n');
      return;
    }
    
    if (!statusOutput.includes('Following migration(s) have not yet been applied:')) {
      if (statusOutput.includes('drift') || statusOutput.includes('conflict')) {
        throw new Error('Database schema drift detected. Manual intervention required.');
      }
    }
    
    // Create backup (in production, this would integrate with your backup system)
    if (!skipBackup && !dryRun) {
      console.log('3. Creating database backup...');
      console.log('   ⚠️  Manual backup required - implement backup integration here');
      console.log('   Ensure you have a recent backup before proceeding\n');
      
      if (!force) {
        console.log('   Use --skip-backup to skip this step (not recommended)');
        console.log('   Use --force to proceed without backup verification');
        throw new Error('Backup verification required');
      }
    } else if (dryRun) {
      console.log('3. Skipping backup (dry run mode)\n');
    }
    
    // Show what will be migrated
    console.log('4. Migration preview:');
    console.log(statusOutput.split('Following migration(s) have not yet been applied:')[1] || 'Unknown migrations');
    console.log();
    
    if (dryRun) {
      console.log('🔍 DRY RUN: Would execute migration here');
      console.log('   Command: npx prisma migrate deploy');
      return;
    }
    
    // Execute migration
    console.log('5. Executing migration...');
    const migrateOutput = execSync('npx prisma migrate deploy', { 
      encoding: 'utf8',
      env: { ...process.env, DATABASE_ENV: 'production' },
      stdio: 'inherit'
    });
    
    console.log('\n6. Verifying migration...');
    const postStatusOutput = execSync('npx prisma migrate status', { 
      encoding: 'utf8',
      env: { ...process.env, DATABASE_ENV: 'production' }
    });
    
    if (!postStatusOutput.includes('No pending migrations')) {
      throw new Error('Migration appears to have failed - still showing pending migrations');
    }
    
    console.log('✅ Migration completed successfully!\n');
    
    // Generate Prisma client
    console.log('7. Regenerating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('\n🎉 Production migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Monitor application logs for any issues');
    console.log('2. Run smoke tests on critical functionality');
    console.log('3. Be prepared to rollback if issues are detected');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : error);
    console.error('\n🚨 Production migration failed. Immediate action required:');
    console.error('1. Check database connectivity');
    console.error('2. Review migration files for issues');
    console.error('3. Consider rolling back if data integrity is at risk');
    console.error('4. Contact team lead if manual intervention is needed');
    process.exit(1);
  }
}

// CLI interface
const args = process.argv.slice(2);
const options: MigrationOptions = {
  dryRun: args.includes('--dry-run'),
  skipBackup: args.includes('--skip-backup'),
  force: args.includes('--force'),
};

if (args.includes('--help')) {
  console.log('Production Migration Script');
  console.log('');
  console.log('Usage: tsx scripts/migrate-production.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run      Preview what would be migrated without executing');
  console.log('  --skip-backup  Skip backup verification (not recommended)');
  console.log('  --force        Proceed without backup verification');
  console.log('  --help         Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  tsx scripts/migrate-production.ts --dry-run');
  console.log('  tsx scripts/migrate-production.ts --force');
  process.exit(0);
}

runProductionMigration(options);