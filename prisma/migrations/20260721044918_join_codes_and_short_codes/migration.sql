-- AlterTable
ALTER TABLE "public"."invitations" ADD COLUMN     "shortCode" TEXT;

-- AlterTable
ALTER TABLE "public"."library_members" ADD COLUMN     "joinedViaCodeId" TEXT;

-- CreateTable
CREATE TABLE "public"."join_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "join_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "join_codes_code_key" ON "public"."join_codes"("code");

-- CreateIndex
CREATE INDEX "join_codes_libraryId_idx" ON "public"."join_codes"("libraryId");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_shortCode_key" ON "public"."invitations"("shortCode");

-- AddForeignKey
ALTER TABLE "public"."library_members" ADD CONSTRAINT "library_members_joinedViaCodeId_fkey" FOREIGN KEY ("joinedViaCodeId") REFERENCES "public"."join_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."join_codes" ADD CONSTRAINT "join_codes_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "public"."libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."join_codes" ADD CONSTRAINT "join_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

