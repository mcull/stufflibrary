# INFRA-001: Database Safety & Staging Environment Setup

**Priority**: CRITICAL
**Status**: IMPLEMENTED
**Assignee**: Claude Code

**Implementation Date**: 2025-01-25
**Next Actions**: Set up actual staging database in Supabase and configure backup monitoring

## ✅ IMPLEMENTATION STATUS

### Completed ✅

1. **Environment Configuration System** - `src/lib/db-config.ts`
   - Environment-specific database URL management
   - Automatic environment detection (development/staging/production/test)
   - Safety checks preventing destructive operations in production

2. **Safe Database Scripts** - `scripts/db-safety-check.ts`
   - Pre-execution safety validation
   - Environment verification
   - Operation blocking for production

3. **Production Migration Script** - `scripts/migrate-production.ts`
   - Comprehensive production deployment process
   - Dry-run capability
   - Backup verification requirements
   - Rollback guidance

4. **Pre-commit Hooks** - `.husky/pre-commit-db-safety`
   - Automatic detection of dangerous database commands
   - Prevents accidental commits of destructive operations
   - Integrated with existing lint-staged workflow

5. **Package.json Scripts** - Environment-specific commands
   - `npm run db:staging:*` - Safe staging operations
   - `npm run db:production:*` - Production operations with safeguards
   - `npm run db:safety-check` - Manual safety verification

6. **Backup Monitoring** - `scripts/backup-monitor.ts`
   - Backup status checking
   - Alert system for failed or stale backups
   - Restore testing capabilities

7. **Comprehensive Documentation** - `docs/DATABASE_MIGRATION_GUIDE.md`
   - Complete workflow guide
   - Emergency procedures
   - Best practices and troubleshooting

### Required Manual Setup ⚠️

1. **Create Staging Database**
   ```bash
   # In Supabase dashboard:
   # 1. Create new project: stufflibrary-staging
   # 2. Copy current production schema
   # 3. Set STAGING_DATABASE_URL environment variable
   ```

2. **Configure Production Backups**
   ```bash
   # Enable automated backups in Supabase
   # Set up monitoring alerts
   # Test restore procedures
   ```

3. **Set Up Monitoring Alerts**
   ```bash
   # Configure alerts for:
   # - Failed migrations
   # - Database connectivity issues
   # - Backup failures
   ```

### Verification Checklist

- [ ] Staging database created and accessible
- [ ] Environment variables configured (`STAGING_DATABASE_URL`, `DATABASE_ENV`)
- [ ] Safety scripts tested: `npm run db:safety-check "migrate reset"`
- [ ] Pre-commit hooks active: Try committing dangerous command
- [ ] Production deployment tested: `npm run db:migrate:production --dry-run`
- [ ] Backup monitoring configured: `npm run db:backup:monitor`
- [ ] Team trained on new procedures

## Problem Statement

Currently running with a single production database in Supabase with no staging environment. This creates significant risk:

1. **Data Loss Risk**: Commands like `prisma migrate reset` and `prisma db push --accept-data-loss` can destroy production data
2. **No Safe Testing**: Schema changes are applied directly to production 
3. **Migration Drift**: Database schema can get out of sync with migration files
4. **No Rollback Strategy**: No safe way to test or roll back problematic migrations

## Required Actions

### 1. Create Staging Database in Supabase

**Setup Steps:**
- [ ] Create new Supabase project for staging: `stufflibrary-staging`
- [ ] Copy current production schema to staging
- [ ] Generate sample/anonymized data for staging testing
- [ ] Document staging database connection details

**Environment Variables:**
```bash
# Production
DATABASE_URL="postgresql://..."

# Staging  
STAGING_DATABASE_URL="postgresql://..."
```

### 2. Lock Down Production Database

**Implement Database Access Controls:**
- [ ] **Remove developer direct access** to production database
- [ ] **Create read-only access** for developers to query production (for debugging only)
- [ ] **Restrict migration commands** - only allow `prisma migrate deploy` in production
- [ ] **Set up database backups** - automated daily backups with point-in-time recovery

**Production-Safe Commands Only:**
```bash
# ✅ SAFE for production
npx prisma migrate deploy    # Deploy pre-tested migrations
npx prisma generate         # Generate client only

# ❌ NEVER in production  
npx prisma migrate reset    # DESTROYS ALL DATA
npx prisma db push         # Bypasses migration history
npx prisma migrate dev     # Creates new migrations
```

### 3. Implement Safe Migration Workflow

**Development Process:**
1. **Local Development**: Use local database or Docker for initial development
2. **Staging Testing**: Test all schema changes on staging first
3. **Migration Creation**: Create migrations with `prisma migrate dev` on staging
4. **Staging Validation**: Run full test suite against staging with new schema
5. **Production Deploy**: Use `prisma migrate deploy` to apply tested migrations

**Required Tooling:**
- [ ] **Pre-commit hooks** to prevent dangerous commands
- [ ] **CI/CD pipeline** that validates migrations on staging before production
- [ ] **Migration rollback scripts** for emergency situations

### 4. Update Environment Configuration

**Environment-Specific Configs:**
```typescript
// src/lib/db-config.ts
const getDatabaseUrl = () => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return process.env.DATABASE_URL;
    case 'staging': 
      return process.env.STAGING_DATABASE_URL;
    case 'development':
      return process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
    default:
      throw new Error('Invalid NODE_ENV');
  }
};
```

**Package.json Scripts:**
```json
{
  "scripts": {
    "db:migrate:staging": "NODE_ENV=staging npx prisma migrate dev",
    "db:deploy:production": "NODE_ENV=production npx prisma migrate deploy",
    "db:status:production": "NODE_ENV=production npx prisma migrate status"
  }
}
```

### 5. Monitoring & Alerting

**Set Up Alerts For:**
- [ ] Failed migrations in production
- [ ] Database connection issues
- [ ] Unusual query patterns
- [ ] Backup failures

### 6. Documentation & Training

**Create Documentation:**
- [ ] **Database migration guide** for developers
- [ ] **Emergency procedures** for data recovery
- [ ] **Staging environment access** and usage guidelines
- [ ] **Production deployment checklist**

## Implementation Timeline

**Week 1 (Immediate):**
- [ ] Create staging Supabase project
- [ ] Set up environment variables and configs
- [ ] Implement basic access controls

**Week 2:**
- [ ] Set up automated backups
- [ ] Create CI/CD pipeline for migrations
- [ ] Add pre-commit hooks

**Week 3:**
- [ ] Documentation and team training
- [ ] Test emergency recovery procedures

## Success Criteria

- [ ] **Zero risk of accidental production data loss**
- [ ] **All schema changes tested on staging first**
- [ ] **Automated backups and recovery procedures**
- [ ] **Team trained on safe database practices**
- [ ] **Monitoring and alerting in place**

## Cost Estimate

- **Staging Database**: ~$25/month (Supabase Pro)
- **Additional Backup Storage**: ~$10/month
- **Developer Time**: ~20 hours setup + ongoing maintenance

## Notes

This incident (accidental `prisma migrate reset` destroying production data) must never happen again. The staging environment and safety procedures are critical infrastructure that should have been in place from day one.

## Related Issues

- Consider implementing database seeding for consistent staging data
- Evaluate need for blue/green deployment strategy
- Review data retention and GDPR compliance requirements