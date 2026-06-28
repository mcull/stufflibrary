-- AlterEnum
ALTER TYPE "BorrowRequestStatus" ADD VALUE 'RETURN_PENDING';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROBLEM_REPORTED';

-- CreateEnum
CREATE TYPE "ReturnCondition" AS ENUM ('OK', 'MINOR_WEAR', 'DAMAGED');

-- AlterTable
ALTER TABLE "borrow_requests"
  ADD COLUMN "returnCondition" "ReturnCondition",
  ADD COLUMN "returnConditionNote" TEXT,
  ADD COLUMN "returnPhotoUrl" TEXT,
  ADD COLUMN "returnConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "returnConfirmedBy" TEXT,
  ADD COLUMN "returnedLate" BOOLEAN,
  ADD COLUMN "borrowerReturnNote" TEXT,
  ADD COLUMN "lastOverdueReminderAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT,
  ADD COLUMN "cancelledBy" TEXT;
