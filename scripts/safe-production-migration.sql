-- Safe Production Migration Script
-- This script handles both scenarios: existing branches table or fresh database

BEGIN;

-- Check if branches table exists and libraries doesn't
DO $$ 
BEGIN
    -- If branches exists but libraries doesn't, do the rename
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches' AND table_schema = 'public')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'libraries' AND table_schema = 'public') THEN
        
        RAISE NOTICE 'Migrating from branches to libraries schema...';
        
        -- Rename branches table to libraries
        ALTER TABLE "branches" RENAME TO "libraries";
        
        -- Rename branch_members table to library_members  
        ALTER TABLE "branch_members" RENAME TO "library_members";
        
        -- Rename branchId column to libraryId in items table
        ALTER TABLE "items" RENAME COLUMN "branchId" TO "libraryId";
        
        -- Rename branchId column to libraryId in library_members table
        ALTER TABLE "library_members" RENAME COLUMN "branchId" TO "libraryId";
        
        -- Rename branchId column to libraryId in invitations table
        ALTER TABLE "invitations" RENAME COLUMN "branchId" TO "libraryId";
        
        RAISE NOTICE 'Successfully migrated branches to libraries';
        
    -- If libraries already exists, skip
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'libraries' AND table_schema = 'public') THEN
        RAISE NOTICE 'Libraries table already exists, skipping migration';
        
    -- If neither exists, this might be a fresh database - let Prisma handle it
    ELSE
        RAISE NOTICE 'Neither branches nor libraries table found - run prisma db push or migrate deploy';
    END IF;
    
END $$;

-- Ensure item_libraries table exists for many-to-many relationship
CREATE TABLE IF NOT EXISTS "item_libraries" (
    "itemId" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "item_libraries_pkey" PRIMARY KEY ("itemId", "libraryId")
);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add foreign key for itemId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'item_libraries_itemId_fkey' 
        AND table_name = 'item_libraries'
    ) THEN
        ALTER TABLE "item_libraries" ADD CONSTRAINT "item_libraries_itemId_fkey" 
        FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- Add foreign key for libraryId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'item_libraries_libraryId_fkey' 
        AND table_name = 'item_libraries'
    ) THEN
        ALTER TABLE "item_libraries" ADD CONSTRAINT "item_libraries_libraryId_fkey" 
        FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add coordinates to Address table if they don't exist
DO $$ 
BEGIN
    -- Add latitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'addresses' AND column_name = 'latitude' AND table_schema = 'public'
    ) THEN
        ALTER TABLE "addresses" ADD COLUMN "latitude" DOUBLE PRECISION;
        RAISE NOTICE 'Added latitude column to addresses table';
    END IF;
    
    -- Add longitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'addresses' AND column_name = 'longitude' AND table_schema = 'public'
    ) THEN
        ALTER TABLE "addresses" ADD COLUMN "longitude" DOUBLE PRECISION;
        RAISE NOTICE 'Added longitude column to addresses table';
    END IF;
END $$;

-- Update indexes and constraints names if needed
DO $$
BEGIN
    -- Rename indexes if they exist with old names
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invitations_branchId_idx') THEN
        ALTER INDEX "invitations_branchId_idx" RENAME TO "invitations_libraryId_idx";
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invitations_email_senderId_branchId_key') THEN
        ALTER INDEX "invitations_email_senderId_branchId_key" RENAME TO "invitations_email_senderId_libraryId_key";
    END IF;
END $$;

COMMIT;

-- Final verification
SELECT 
    'libraries' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'libraries' AND table_schema = 'public') as exists
UNION ALL
SELECT 
    'library_members' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'library_members' AND table_schema = 'public') as exists
UNION ALL
SELECT 
    'item_libraries' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'item_libraries' AND table_schema = 'public') as exists;