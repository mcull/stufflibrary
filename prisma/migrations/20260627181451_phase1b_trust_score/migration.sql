-- AlterTable
ALTER TABLE "users" ALTER COLUMN "trustScore" SET DEFAULT 50.0;
ALTER TABLE "users" ADD COLUMN "trustTier" TEXT;
