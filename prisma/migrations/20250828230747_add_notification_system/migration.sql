/*
  Warnings:

  - You are about to drop the column `borrowedAt` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `lastReminderAt` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `lenderResponse` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `pickedUpAt` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `promiseText` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `promisedReturnBy` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `remindersSent` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `requestedAt` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `respondedAt` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `responseToken` on the `borrow_requests` table. All the data in the column will be lost.
  - You are about to drop the column `signature` on the `borrow_requests` table. All the data in the column will be lost.
  - The `status` column on the `borrow_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `isAvailable` on the `items` table. All the data in the column will be lost.
  - Added the required column `requestedReturnDate` to the `borrow_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `borrow_requests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BorrowRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'ACTIVE', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('BORROW_REQUEST_RECEIVED', 'BORROW_REQUEST_APPROVED', 'BORROW_REQUEST_DECLINED', 'BORROW_REQUEST_CANCELLED', 'ITEM_DUE_TOMORROW', 'ITEM_OVERDUE', 'ITEM_RETURNED', 'RETURN_CONFIRMED', 'LIBRARY_INVITATION', 'SYSTEM_ANNOUNCEMENT');

-- AlterTable
ALTER TABLE "public"."borrow_requests" DROP COLUMN "borrowedAt",
DROP COLUMN "dueDate",
DROP COLUMN "lastReminderAt",
DROP COLUMN "lenderResponse",
DROP COLUMN "notes",
DROP COLUMN "pickedUpAt",
DROP COLUMN "promiseText",
DROP COLUMN "promisedReturnBy",
DROP COLUMN "remindersSent",
DROP COLUMN "requestedAt",
DROP COLUMN "respondedAt",
DROP COLUMN "responseToken",
DROP COLUMN "signature",
ADD COLUMN     "actualReturnDate" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lenderMessage" TEXT,
ADD COLUMN     "requestMessage" TEXT,
ADD COLUMN     "requestedReturnDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."BorrowRequestStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."items" DROP COLUMN "isAvailable",
ADD COLUMN     "currentBorrowRequestId" TEXT;

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "relatedItemId" TEXT,
    "relatedRequestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "public"."notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "public"."notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "public"."notifications"("createdAt");

-- CreateIndex
CREATE INDEX "borrow_requests_borrowerId_idx" ON "public"."borrow_requests"("borrowerId");

-- CreateIndex
CREATE INDEX "borrow_requests_lenderId_idx" ON "public"."borrow_requests"("lenderId");

-- CreateIndex
CREATE INDEX "borrow_requests_itemId_idx" ON "public"."borrow_requests"("itemId");

-- CreateIndex
CREATE INDEX "borrow_requests_status_idx" ON "public"."borrow_requests"("status");

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
