-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "agreedToTermsAt" TIMESTAMP(3),
  ADD COLUMN "agreedTermsVersion" TEXT;
