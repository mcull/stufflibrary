-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "smsConsentAt" TIMESTAMP(3),
ADD COLUMN     "smsOptIn" BOOLEAN NOT NULL DEFAULT false;
