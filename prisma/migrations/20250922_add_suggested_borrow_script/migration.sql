-- AlterTable: add suggestedBorrowScript for items
ALTER TABLE "public"."items"
ADD COLUMN IF NOT EXISTS "suggestedBorrowScript" TEXT;

