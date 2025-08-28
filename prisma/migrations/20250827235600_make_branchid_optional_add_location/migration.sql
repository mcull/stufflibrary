-- AlterTable
ALTER TABLE "public"."items" 
ADD COLUMN IF NOT EXISTS "location" TEXT,
ALTER COLUMN "branchId" DROP NOT NULL;

-- Update foreign key constraint to handle nullable branchId
ALTER TABLE "public"."items" DROP CONSTRAINT IF EXISTS "items_branchId_fkey";
ALTER TABLE "public"."items" ADD CONSTRAINT "items_branchId_fkey" 
FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;