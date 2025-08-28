# Vercel Automated Migration System

## Problem Solved

**Issue**: Vercel deployments weren't running database migrations, causing production failures when new schema changes were deployed.

**Solution**: Automated migration system that runs during Vercel builds with monitoring and manual override capabilities.

## How It Works

### 1. Automated Build-Time Migrations

**File**: `scripts/vercel-build.sh`
- Runs automatically on every Vercel deployment
- Detects environment (production/preview/development)
- Runs `prisma migrate deploy` for production and preview
- Verifies schema after migration
- Continues build process even if migration fails (with warnings)

**Configuration**: `vercel.json`
```json
{
  "buildCommand": "bash scripts/vercel-build.sh"
}
```

### 2. Migration Status Monitoring

**Endpoint**: `/api/admin/migration-status`

**Usage**:
```bash
# Check current migration status
curl "https://your-app.vercel.app/api/admin/migration-status?admin_key=YOUR_ADMIN_KEY"
```

**Response**:
```json
{
  "timestamp": "2025-08-28T18:30:00.000Z",
  "environment": "production",
  "database": {
    "connected": true,
    "tables": {
      "found": ["users", "libraries", "library_members", "addresses"],
      "missing": [],
      "status": "healthy"
    },
    "coordinates": {
      "columns": ["latitude", "longitude"],
      "status": "enabled"
    },
    "counts": {
      "users": 150,
      "libraries": 25,
      "invitations": 12
    }
  },
  "health": {
    "overall": "healthy",
    "canCreateLibraries": true,
    "hasGoogleMaps": true,
    "criticalTablesPresent": true
  }
}
```

### 3. Manual Migration Trigger

**Endpoint**: `/api/admin/migrate` (POST)

**Usage**:
```bash
# Trigger migrations manually
curl -X POST "https://your-app.vercel.app/api/admin/migrate" \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d "{}"
```

## Setup Instructions

### 1. Environment Variables in Vercel

Add these environment variables in Vercel dashboard:

```bash
# Required
DATABASE_URL="postgresql://user:pass@host:5432/database"

# Optional (for admin endpoints)
ADMIN_API_KEY="your-secret-admin-key-here"

# Google Maps (if using)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-key"
NEXT_PUBLIC_GOOGLE_MAP_ID="your-map-id"
```

### 2. Make Build Script Executable

```bash
chmod +x scripts/vercel-build.sh
```

### 3. Deploy Configuration

The system is automatically active once you deploy with the updated `vercel.json`.

## Monitoring Your Deployments

### Check Migration Status After Deployment

1. **Via API** (recommended):
   ```bash
   curl "https://your-app.vercel.app/api/admin/migration-status?admin_key=YOUR_KEY"
   ```

2. **Via Vercel Logs**:
   - Go to Vercel dashboard → Your project → Functions tab
   - Look for build logs containing migration output

3. **Test Library Creation**:
   ```bash
   # Try creating a library via API
   curl -X POST "https://your-app.vercel.app/api/libraries" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Library", "description": "Test"}'
   ```

### Build Log Indicators

**Successful migration**:
```
🚀 Starting Vercel build with migrations...
🏭 Production deployment detected
📦 Generating Prisma client...
🗄️ Deploying database migrations...
✅ Migrations deployed successfully
🔍 Verifying database schema...
✅ Database schema verification passed
🔨 Building Next.js application...
🎉 Build completed successfully!
```

**Migration failure** (but build continues):
```
❌ Migration deployment failed
This might be expected for the first deployment or if database is not ready
Continuing with build - manual migration may be needed
```

## Troubleshooting

### Migration Fails During Build

1. **Check Vercel build logs** for specific error messages
2. **Verify DATABASE_URL** is correctly set in Vercel environment variables
3. **Check database connectivity** from your local machine
4. **Use manual migration endpoint** if automatic migration failed

### Still Getting "Table Does Not Exist" Errors

1. **Check migration status**:
   ```bash
   curl "https://your-app.vercel.app/api/admin/migration-status?admin_key=YOUR_KEY"
   ```

2. **Trigger manual migration**:
   ```bash
   curl -X POST "https://your-app.vercel.app/api/admin/migrate" \
     -H "Authorization: Bearer YOUR_ADMIN_KEY" \
     -H "Content-Type: application/json" \
     -d "{}"
   ```

3. **Run SQL migration directly** (last resort):
   ```sql
   -- Use the safe migration script
   \i scripts/safe-production-migration.sql
   ```

### Database Connection Issues

- Ensure DATABASE_URL is accessible from Vercel's servers
- Check if your database provider allows connections from Vercel IPs
- Verify connection string format and credentials

## Migration Flow Diagram

```
Vercel Deployment Trigger
         ↓
   vercel-build.sh runs
         ↓
   Environment Detection
    ├── Production/Preview → Run Migrations
    └── Development → Skip Migrations
         ↓
   prisma migrate deploy
         ↓
   Schema Verification
         ↓
   next build
         ↓
   Deployment Complete
         ↓
   Monitor via /api/admin/migration-status
```

## Security Notes

- Admin endpoints require `ADMIN_API_KEY` environment variable
- Migration endpoint only works in production/preview environments
- Always backup your database before major schema changes
- Monitor logs for migration failures

## Benefits

✅ **Automatic**: Migrations run on every deployment  
✅ **Safe**: Build continues even if migration fails  
✅ **Monitored**: Real-time status checking  
✅ **Recoverable**: Manual migration trigger available  
✅ **Verified**: Post-migration schema validation  
✅ **Logged**: Comprehensive build and migration logs  

This system ensures your database schema stays in sync with your code deployments automatically!