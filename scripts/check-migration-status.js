#!/usr/bin/env node

/**
 * Script to check migration status and provide migration commands for production
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require('child_process');

console.log('🔍 Checking Migration Status');
console.log('============================');

try {
  // Check current migration status
  console.log('📋 Current migration status:');
  const status = execSync('npx prisma migrate status', { encoding: 'utf8' });
  console.log(status);

  console.log('\n📊 Database introspection:');
  try {
    execSync('npx prisma db pull --print', { encoding: 'utf8' });
    console.log('✅ Database connection successful');
  } catch (e) {
    console.log('❌ Database connection failed:', e.message);
  }

  console.log('\n🚀 To fix production database:');
  console.log('1. Run: npx prisma migrate deploy');
  console.log('2. Or if starting fresh: npx prisma db push');
  console.log('3. Generate client: npx prisma generate');
} catch (error) {
  console.error('❌ Migration check failed:', error.message);

  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check DATABASE_URL environment variable');
  console.log('2. Ensure database is accessible');
  console.log('3. Run: npx prisma migrate deploy (for production)');
  console.log('4. Or run: npx prisma db push (for development)');
}
