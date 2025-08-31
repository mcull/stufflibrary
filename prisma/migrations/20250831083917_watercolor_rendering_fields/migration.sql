-- CreateEnum
CREATE TYPE "public"."SecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'PASSWORD_RESET', 'ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY', 'API_ABUSE', 'RATE_LIMIT_EXCEEDED', 'IP_BLOCKED', 'UNAUTHORIZED_ACCESS', 'DATA_BREACH_ATTEMPT', 'ADMIN_ACTION', 'BULK_OPERATION', 'EXPORT_DATA', 'DELETE_ACCOUNT');

-- CreateEnum
CREATE TYPE "public"."SecuritySeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."BlockedIPReason" AS ENUM ('FAILED_LOGINS', 'API_ABUSE', 'SUSPICIOUS_ACTIVITY', 'MANUAL_BLOCK', 'AUTOMATED_THREAT', 'SPAM', 'BOT_TRAFFIC');

-- CreateEnum
CREATE TYPE "public"."ComplianceType" AS ENUM ('GDPR_DATA_REQUEST', 'ACCOUNT_DELETION', 'DATA_EXPORT', 'PRIVACY_AUDIT', 'RETENTION_CLEANUP');

-- CreateEnum
CREATE TYPE "public"."ComplianceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."items" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "flags" JSONB,
ADD COLUMN     "styleVersion" TEXT,
ADD COLUMN     "synthIdWatermark" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watercolorThumbUrl" TEXT,
ADD COLUMN     "watercolorUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."security_events" (
    "id" TEXT NOT NULL,
    "type" "public"."SecurityEventType" NOT NULL,
    "severity" "public"."SecuritySeverity" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."blocked_ips" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" "public"."BlockedIPReason" NOT NULL,
    "description" TEXT,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "blockedBy" TEXT,

    CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "details" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."compliance_reports" (
    "id" TEXT NOT NULL,
    "type" "public"."ComplianceType" NOT NULL,
    "status" "public"."ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "userId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "data" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_events_type_idx" ON "public"."security_events"("type");

-- CreateIndex
CREATE INDEX "security_events_severity_idx" ON "public"."security_events"("severity");

-- CreateIndex
CREATE INDEX "security_events_ipAddress_idx" ON "public"."security_events"("ipAddress");

-- CreateIndex
CREATE INDEX "security_events_createdAt_idx" ON "public"."security_events"("createdAt");

-- CreateIndex
CREATE INDEX "security_events_userId_idx" ON "public"."security_events"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_ips_ipAddress_key" ON "public"."blocked_ips"("ipAddress");

-- CreateIndex
CREATE INDEX "blocked_ips_ipAddress_idx" ON "public"."blocked_ips"("ipAddress");

-- CreateIndex
CREATE INDEX "blocked_ips_isActive_idx" ON "public"."blocked_ips"("isActive");

-- CreateIndex
CREATE INDEX "blocked_ips_expiresAt_idx" ON "public"."blocked_ips"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "public"."audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "compliance_reports_type_idx" ON "public"."compliance_reports"("type");

-- CreateIndex
CREATE INDEX "compliance_reports_status_idx" ON "public"."compliance_reports"("status");

-- CreateIndex
CREATE INDEX "compliance_reports_userId_idx" ON "public"."compliance_reports"("userId");

-- CreateIndex
CREATE INDEX "compliance_reports_generatedAt_idx" ON "public"."compliance_reports"("generatedAt");

-- AddForeignKey
ALTER TABLE "public"."security_events" ADD CONSTRAINT "security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."blocked_ips" ADD CONSTRAINT "blocked_ips_blockedBy_fkey" FOREIGN KEY ("blockedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."compliance_reports" ADD CONSTRAINT "compliance_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."compliance_reports" ADD CONSTRAINT "compliance_reports_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
