# Database Migration Guide

This guide covers safe database practices and migration workflows to prevent data loss and ensure system reliability.

## ⚠️ CRITICAL SAFETY RULES

1. **NEVER run destructive operations directly on production**
2. **ALWAYS test migrations on staging first**
3. **ALWAYS have a recent backup before production migrations**
4. **NEVER use `prisma migrate reset` or `prisma db push --accept-data-loss` in production**

## Environment Setup

### Database Environments

We maintain separate databases for each environment:

- **Development**: Local development and testing
- **Staging**: Production-like environment for testing migrations
- **Production**: Live user data (handle with extreme care)
- **Test**: Automated testing (CI/CD)

### Environment Variables

```bash
# Production Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Staging Database  
STAGING_DATABASE_URL="postgresql://..."
STAGING_DIRECT_URL="postgresql://..."

# Test Database
TEST_DATABASE_URL="postgresql://..."
TEST_DIRECT_URL="postgresql://..."

# Environment Override
DATABASE_ENV="development"  # development|staging|production|test
```

## Available Commands

### Development Commands (Safe)

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (with safety checks)
npm run db:push

# Create and run migrations (with safety checks)
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Staging Commands

```bash
# Push schema changes to staging
npm run db:staging:push

# Create and run migrations on staging
npm run db:staging:migrate

# Reset staging database (safe - not production)
npm run db:staging:reset

# Open staging Prisma Studio
npm run db:staging:studio
```

### Production Commands (Use with Extreme Care)

```bash
# Deploy tested migrations to production
npm run db:production:deploy

# Check migration status in production
npm run db:production:status

# Open production Prisma Studio (read-only recommended)
npm run db:production:studio
```

## Migration Workflow

### 1. Local Development

```bash
# Make schema changes in prisma/schema.prisma
vim prisma/schema.prisma

# Test changes locally
npm run db:push  # or npm run db:migrate for migrations

# Test your application
npm run dev
npm run test
```

### 2. Staging Testing

```bash
# Switch to staging environment
export DATABASE_ENV=staging

# Apply your changes to staging
npm run db:staging:migrate

# Run full test suite against staging
npm run test:e2e

# Test critical user journeys manually
```

### 3. Production Deployment

```bash
# Verify staging is working correctly
npm run db:staging:studio

# Create a backup of production (follow your backup procedures)
# This is critical - ensure you have a point-in-time recovery option

# Deploy to production using the safe script
DATABASE_ENV=production tsx scripts/migrate-production.ts

# Or use the npm script
npm run db:production:deploy

# Monitor application logs and metrics
# Be ready to rollback if issues are detected
```

## Safety Scripts

### Database Safety Check

```bash
# Check if an operation is safe for current environment
npm run db:safety-check "migrate reset"

# Example output:
# ❌ BLOCKED: Operation "migrate reset" is not allowed in production
```

### Production Migration Script

```bash
# Preview what would be migrated (recommended first step)
tsx scripts/migrate-production.ts --dry-run

# Run the migration (requires backup verification)
tsx scripts/migrate-production.ts

# Force migration (skip backup checks - use with caution)
tsx scripts/migrate-production.ts --force
```

## Pre-commit Hooks

Pre-commit hooks automatically check for dangerous database commands:

```bash
# These patterns are blocked from being committed:
- "prisma migrate reset"
- "prisma db push --accept-data-loss"
- "DROP TABLE" 
- "TRUNCATE TABLE"
- Dangerous DELETE patterns
```

To bypass (use with extreme caution):
```bash
git commit --no-verify
```

## Emergency Procedures

### Schema Drift Detected

If `prisma migrate status` shows schema drift:

```bash
# 1. Check what changed
prisma db pull --print

# 2. Create a migration to fix the drift
prisma migrate dev --create-only

# 3. Review and test the migration
# 4. Apply through normal workflow
```

### Failed Migration

If a migration fails in production:

```bash
# 1. Check the migration status
npm run db:production:status

# 2. If migration is partially applied, DO NOT run migrate reset
# 3. Create a new migration to fix the issue
# 4. Or restore from backup if data corruption occurred
```

### Data Recovery

1. **Stop the application** to prevent further data loss
2. **Assess the damage** - what data was affected?
3. **Restore from backup** using your backup procedure
4. **Replay any lost transactions** if possible
5. **Update procedures** to prevent recurrence

## Best Practices

### Schema Changes

1. **Make backward-compatible changes when possible**
   - Add new columns as nullable first
   - Use separate migrations for dropping columns
   - Consider feature flags for breaking changes

2. **Test with realistic data volumes**
   - Large table alterations can cause downtime
   - Test migration performance on staging with production-size data

3. **Plan for rollbacks**
   - Some migrations cannot be automatically rolled back
   - Have manual rollback procedures documented

### Data Migrations

1. **Write data migrations carefully**
   - Test with edge cases and null values
   - Handle partial failures gracefully
   - Consider running data migrations separately from schema changes

2. **Monitor during deployment**
   - Watch for locks and performance issues
   - Have circuit breakers for long-running migrations

## Troubleshooting

### Common Issues

#### "Database is not empty" error
```bash
# Don't use --accept-data-loss in production!
# Instead, create a proper migration:
prisma migrate dev --create-only
```

#### Migration conflicts
```bash
# Resolve conflicts in the migration file
# Test the resolution on staging
# Never merge conflicting migrations without testing
```

#### Connection timeouts
```bash
# Check database connectivity
# Verify connection string format
# Ensure database server is accessible
```

### Getting Help

1. **Check migration status**: `npm run db:production:status`
2. **Review recent migrations** in `prisma/migrations/`
3. **Check application logs** for database errors
4. **Contact team lead** for production issues
5. **Have backup restoration procedure ready**

## Configuration Reference

### Environment Detection

The system automatically detects the environment using:

1. `DATABASE_ENV` environment variable (highest priority)
2. `NODE_ENV` environment variable
3. Falls back to 'development'

### Database URLs

Each environment uses its own database URL:

```typescript
// Automatic environment-based URL selection
const config = getDatabaseConfig();
console.log(config.environment); // 'development' | 'staging' | 'production'
console.log(config.isProduction); // boolean
console.log(config.allowDestructiveOperations); // false in production
```

## Monitoring and Alerts

### Set Up Alerts For:

- [ ] Failed migrations in production
- [ ] Database connection failures
- [ ] Schema drift detection
- [ ] Unusual query patterns
- [ ] Backup failures
- [ ] Long-running migrations

### Metrics to Monitor:

- Migration execution time
- Database connection pool status
- Query performance
- Error rates after migrations
- Database disk usage

---

## Quick Reference

| Command | Environment | Safety | Purpose |
|---------|------------|--------|---------|
| `npm run db:migrate` | Development | ✅ Safe | Create and run migrations |
| `npm run db:staging:migrate` | Staging | ✅ Safe | Test migrations |
| `npm run db:production:deploy` | Production | ⚠️ Careful | Deploy tested migrations |
| `npm run db:push` | Development | ✅ Safe | Quick schema sync |
| `npm run db:staging:reset` | Staging | ✅ Safe | Reset staging data |
| `prisma migrate reset` | Production | ❌ NEVER | Destroys all data |

Remember: **When in doubt, test on staging first!**