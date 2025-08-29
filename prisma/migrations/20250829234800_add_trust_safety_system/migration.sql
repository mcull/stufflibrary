-- CreateEnum
CREATE TYPE "public"."UserReportReason" AS ENUM ('INAPPROPRIATE_CONTENT', 'SPAM', 'FRAUD', 'HARASSMENT', 'COPYRIGHT_VIOLATION', 'SAFETY_CONCERN', 'TERMS_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "public"."ReportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."DisputeType" AS ENUM ('ITEM_NOT_RETURNED', 'ITEM_DAMAGED', 'ITEM_NOT_AS_DESCRIBED', 'PAYMENT_DISPUTE', 'HARASSMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DisputeStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."AdminActionType" AS ENUM ('USER_WARNING', 'USER_SUSPENSION', 'USER_UNSUSPENSION', 'TRUST_SCORE_ADJUSTMENT', 'ITEM_REMOVAL', 'LIBRARY_SUSPENSION', 'DISPUTE_RESOLUTION', 'MANUAL_INTERVENTION');

-- AlterTable
ALTER TABLE "public"."users" 
ADD COLUMN "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
ADD COLUMN "warningCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "suspensionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastWarningAt" TIMESTAMP(3),
ADD COLUMN "lastSuspensionAt" TIMESTAMP(3),
ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suspensionEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."user_reports" (
    "id" TEXT NOT NULL,
    "reason" "public"."UserReportReason" NOT NULL,
    "description" TEXT,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."ReportPriority" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "itemId" TEXT,
    "libraryId" TEXT,
    "notes" TEXT,
    "evidence" JSONB,

    CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."disputes" (
    "id" TEXT NOT NULL,
    "type" "public"."DisputeType" NOT NULL,
    "status" "public"."DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."ReportPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "partyAId" TEXT NOT NULL,
    "partyBId" TEXT NOT NULL,
    "itemId" TEXT,
    "borrowRequestId" TEXT,
    "assignedTo" TEXT,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_actions" (
    "id" TEXT NOT NULL,
    "type" "public"."AdminActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_reports_status_idx" ON "public"."user_reports"("status");

-- CreateIndex
CREATE INDEX "user_reports_priority_idx" ON "public"."user_reports"("priority");

-- CreateIndex
CREATE INDEX "user_reports_createdAt_idx" ON "public"."user_reports"("createdAt");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "public"."disputes"("status");

-- CreateIndex
CREATE INDEX "disputes_type_idx" ON "public"."disputes"("type");

-- CreateIndex
CREATE INDEX "disputes_priority_idx" ON "public"."disputes"("priority");

-- CreateIndex
CREATE INDEX "disputes_createdAt_idx" ON "public"."disputes"("createdAt");

-- CreateIndex
CREATE INDEX "admin_actions_type_idx" ON "public"."admin_actions"("type");

-- CreateIndex
CREATE INDEX "admin_actions_createdAt_idx" ON "public"."admin_actions"("createdAt");

-- CreateIndex
CREATE INDEX "admin_actions_targetUserId_idx" ON "public"."admin_actions"("targetUserId");

-- AddForeignKey
ALTER TABLE "public"."user_reports" ADD CONSTRAINT "user_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_reports" ADD CONSTRAINT "user_reports_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_reports" ADD CONSTRAINT "user_reports_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_reports" ADD CONSTRAINT "user_reports_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes" ADD CONSTRAINT "disputes_partyAId_fkey" FOREIGN KEY ("partyAId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes" ADD CONSTRAINT "disputes_partyBId_fkey" FOREIGN KEY ("partyBId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes" ADD CONSTRAINT "disputes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disputes" ADD CONSTRAINT "disputes_borrowRequestId_fkey" FOREIGN KEY ("borrowRequestId") REFERENCES "public"."borrow_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin_actions" ADD CONSTRAINT "admin_actions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin_actions" ADD CONSTRAINT "admin_actions_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;