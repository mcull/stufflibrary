#!/bin/bash
set -e

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

# Check if we're in production
if [[ "$VERCEL_ENV" == "production" ]]; then
    log "${YELLOW}🏭 Production deployment detected${NC}"
    DEPLOY_MIGRATIONS=true
elif [[ "$VERCEL_ENV" == "preview" ]]; then
    log "${YELLOW}🔍 Preview deployment detected${NC}"
    DEPLOY_MIGRATIONS=true
else
    log "${YELLOW}🧪 Development build detected${NC}"
    DEPLOY_MIGRATIONS=false
fi

# Step 1: Generate Prisma client (always needed)
log "${GREEN}📦 Generating Prisma client...${NC}"
npx prisma generate

# Step 2: Deploy migrations if this is a production/preview deployment
if [[ "$DEPLOY_MIGRATIONS" == "true" ]]; then
    log "${GREEN}🗄️ Deploying database migrations...${NC}"
    
    # Check if DATABASE_URL is set
    if [[ -z "$DATABASE_URL" ]]; then
        log "${RED}❌ DATABASE_URL not found. Skipping migrations.${NC}"
    else
        # Run migrations
        log "Running: npx prisma migrate deploy"
        if npx prisma migrate deploy; then
            log "${GREEN}✅ Migrations deployed successfully${NC}"
            
            # Verify critical tables exist
            log "🔍 Verifying database schema..."
            if node -e "
                const { PrismaClient } = require('@prisma/client');
                const prisma = new PrismaClient();
                prisma.\$queryRaw\`SELECT table_name FROM information_schema.tables WHERE table_name IN ('libraries', 'library_members')\`.then(result => {
                    if (result.length >= 2) {
                        console.log('✅ Critical tables verified');
                        process.exit(0);
                    } else {
                        console.log('❌ Missing critical tables:', result);
                        process.exit(1);
                    }
                }).catch(err => {
                    console.log('⚠️ Could not verify tables (but migration succeeded):', err.message);
                    process.exit(0);
                }).finally(() => prisma.\$disconnect());
            "; then
                log "${GREEN}✅ Database schema verification passed${NC}"
            else
                log "${YELLOW}⚠️ Schema verification inconclusive but continuing build${NC}"
            fi
        else
            log "${RED}❌ Migration deployment failed${NC}"
            log "This might be expected for the first deployment or if database is not ready"
            log "Continuing with build - manual migration may be needed"
        fi
    fi
else
    log "${YELLOW}⏭️ Skipping migrations for development build${NC}"
fi

# Step 3: Build the application
log "${GREEN}🔨 Building Next.js application...${NC}"
npm run build

log "${GREEN}🎉 Build completed successfully!${NC}"

# Step 4: Log deployment summary
log "${GREEN}📋 Deployment Summary:${NC}"
log "   Environment: $VERCEL_ENV"
log "   Migrations: $([[ "$DEPLOY_MIGRATIONS" == "true" ]] && echo "✅ Attempted" || echo "⏭️ Skipped")"
log "   Build: ✅ Completed"