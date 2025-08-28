# Production Deployment Guide for Library Updates

## Issue

Production database missing `libraries` table after library management system updates.

## Root Cause

Database migrations were not run in production after deploying code changes that renamed `branches` to `libraries`.

## Critical Migrations Required

The following migrations need to be applied in production:

1. `20250828071554_rename_branches_to_libraries` - Renames core tables
2. `20250828071850_create_item_libraries_mapping_table` - Creates item-library relationships
3. `20250828155434_add_coordinates_to_user` - Adds coordinates for Google Maps

## Production Fix Steps

### Option 1: Deploy Migrations (Recommended)

```bash
# In production environment
npx prisma migrate deploy
npx prisma generate
```

### Option 2: If Migration Issues

If migrations fail due to schema conflicts:

```bash
# Check current migration status
npx prisma migrate status

# Contact database administrator for manual schema fixes
# DO NOT run destructive commands in production
```

### Option 3: Manual SQL Migration (Safest)

Use the provided safe migration script:

```bash
# Run the safe migration script
psql $DATABASE_URL -f scripts/safe-production-migration.sql
npx prisma generate
```

⚠️ **Warning**: Always backup database before schema changes!

## Verification Steps

After running migrations, verify:

1. **Tables exist**:

   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN ('libraries', 'library_members');
   ```

2. **Test library creation**:
   - Try creating a library via API
   - Check `/api/libraries` endpoint

3. **Google Maps functionality**:
   - Verify coordinates columns exist in Address table
   - Test map display on library pages

## Rollback Plan

If issues arise, rollback steps:

1. Revert to previous deployment
2. Contact database administrator for schema restoration
3. Restore database from backup if needed

## Environment Variables

Ensure these are set in production:

- `DATABASE_URL` - Production database connection
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - For map functionality
- `NEXT_PUBLIC_GOOGLE_MAP_ID` - For custom map styling

## Post-Deployment Checklist

- [ ] Libraries table exists and is accessible
- [ ] Library creation works via UI
- [ ] Google Maps displays correctly
- [ ] Existing user data preserved
- [ ] API endpoints respond correctly
- [ ] E2E tests pass (if applicable)

## Emergency Contacts

If issues persist:

- Check application logs for detailed error messages
- Verify database connectivity
- Ensure all environment variables are set correctly
