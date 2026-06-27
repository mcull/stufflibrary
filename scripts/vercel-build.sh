#!/bin/bash
# Fail the whole build on ANY error, unset var, or failed pipe stage.
# P0-8: a migration failure MUST fail the deploy so code never ships against an
# un-migrated database (this is how production once lost the `libraries` table).
set -euo pipefail

echo "🚀 Starting Vercel build with migrations..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Determine whether this deploy should apply migrations, and — critically —
# WHICH database to migrate. The Prisma CLI reads env("DATABASE_URL"), so we
# resolve the correct target per environment here (mirroring src/lib/db-config):
# production -> the production DB, preview -> the STAGING DB (never production).
VERCEL_ENV="${VERCEL_ENV:-}"
if [[ "$VERCEL_ENV" == "production" ]]; then
    log "${YELLOW}🏭 Production deployment detected${NC}"
    DEPLOY_MIGRATIONS=true
    MIGRATE_DATABASE_URL="${PRODUCTION_DATABASE_URL:-${DATABASE_URL:-}}"
    MIGRATE_DIRECT_URL="${PRODUCTION_DIRECT_URL:-${DIRECT_URL:-}}"
elif [[ "$VERCEL_ENV" == "preview" ]]; then
    log "${YELLOW}🔍 Preview deployment detected${NC}"
    DEPLOY_MIGRATIONS=true
    # Preview deploys migrate STAGING, never production.
    MIGRATE_DATABASE_URL="${STAGING_DATABASE_URL:-${DATABASE_URL:-}}"
    MIGRATE_DIRECT_URL="${STAGING_DIRECT_URL:-${DIRECT_URL:-}}"
else
    log "${YELLOW}🧪 Development build detected${NC}"
    DEPLOY_MIGRATIONS=false
fi

# Step 1: Generate Prisma client (always needed)
log "${GREEN}📦 Generating Prisma client...${NC}"
npx prisma generate

# Step 2: Deploy migrations if this is a production/preview deployment.
# This is the single, authoritative migration path (the standalone
# production-migration GitHub Action was retired in P0-8). Any failure below
# aborts the build via `set -e`, so a broken migration never ships code.
if [[ "$DEPLOY_MIGRATIONS" == "true" ]]; then
    log "${GREEN}🗄️ Deploying database migrations...${NC}"

    # A deploy that intends to migrate but resolved no database URL is
    # misconfigured. Silently skipping here is what previously shipped code
    # against an un-migrated DB, so treat it as a hard failure instead.
    if [[ -z "${MIGRATE_DATABASE_URL:-}" ]]; then
        log "${RED}❌ No database URL resolved for a $VERCEL_ENV deploy — aborting.${NC}"
        exit 1
    fi

    # Safety net: a non-production deploy must NEVER migrate the production DB
    # (e.g. STAGING_DATABASE_URL missing and DATABASE_URL mis-scoped to prod).
    if [[ "$VERCEL_ENV" != "production" && -n "${PRODUCTION_DATABASE_URL:-}" && "$MIGRATE_DATABASE_URL" == "${PRODUCTION_DATABASE_URL}" ]]; then
        log "${RED}❌ Refusing to migrate the production database from a $VERCEL_ENV deploy. Set STAGING_DATABASE_URL.${NC}"
        exit 1
    fi

    log "Running: npx prisma migrate deploy (target env: $VERCEL_ENV)"
    DATABASE_URL="$MIGRATE_DATABASE_URL" DIRECT_URL="${MIGRATE_DIRECT_URL:-}" npx prisma migrate deploy
    log "${GREEN}✅ Migrations deployed successfully${NC}"

    # Verify critical tables actually exist. A "successful" migrate that leaves
    # core tables missing is exactly the silent failure we're guarding against,
    # so a failed verification fails the build.
    log "🔍 Verifying database schema..."
    DATABASE_URL="$MIGRATE_DATABASE_URL" DIRECT_URL="${MIGRATE_DIRECT_URL:-}" node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$queryRaw\`SELECT table_name FROM information_schema.tables WHERE table_name IN ('libraries', 'library_members')\`.then(result => {
            if (result.length >= 2) {
                console.log('✅ Critical tables verified');
                process.exit(0);
            } else {
                console.error('❌ Missing critical tables:', result);
                process.exit(1);
            }
        }).catch(err => {
            console.error('❌ Could not verify critical tables:', err.message);
            process.exit(1);
        }).finally(() => prisma.\$disconnect());
    "
    log "${GREEN}✅ Database schema verification passed${NC}"
else
    log "${YELLOW}⏭️ Skipping migrations for development build${NC}"
fi

# Step 3: Build the application
log "${GREEN}🔨 Building Next.js application...${NC}"
npm run build

log "${GREEN}🎉 Build completed successfully!${NC}"

# Step 4: Log deployment summary
log "${GREEN}📋 Deployment Summary:${NC}"
log "   Environment: ${VERCEL_ENV:-unknown}"
log "   Migrations: $([[ "$DEPLOY_MIGRATIONS" == "true" ]] && echo "✅ Applied" || echo "⏭️ Skipped")"
log "   Build: ✅ Completed"
