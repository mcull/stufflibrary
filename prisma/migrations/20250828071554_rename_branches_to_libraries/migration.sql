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

-- Update foreign key constraint names to reflect new table names
-- Note: PostgreSQL automatically updates constraint names when renaming tables/columns