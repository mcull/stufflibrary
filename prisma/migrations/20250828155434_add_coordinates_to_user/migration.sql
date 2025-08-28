-- AlterTable
ALTER TABLE "public"."libraries" RENAME CONSTRAINT "branches_pkey" TO "libraries_pkey";

-- AlterTable
ALTER TABLE "public"."library_members" RENAME CONSTRAINT "branch_members_pkey" TO "library_members_pkey";

-- RenameForeignKey
ALTER TABLE "public"."invitations" RENAME CONSTRAINT "invitations_branchId_fkey" TO "invitations_libraryId_fkey";

-- RenameForeignKey
ALTER TABLE "public"."libraries" RENAME CONSTRAINT "branches_ownerId_fkey" TO "libraries_ownerId_fkey";

-- RenameForeignKey
ALTER TABLE "public"."library_members" RENAME CONSTRAINT "branch_members_branchId_fkey" TO "library_members_libraryId_fkey";

-- RenameForeignKey
ALTER TABLE "public"."library_members" RENAME CONSTRAINT "branch_members_userId_fkey" TO "library_members_userId_fkey";

-- RenameIndex
ALTER INDEX "public"."invitations_branchId_idx" RENAME TO "invitations_libraryId_idx";

-- RenameIndex
ALTER INDEX "public"."invitations_email_senderId_branchId_key" RENAME TO "invitations_email_senderId_libraryId_key";

-- RenameIndex
ALTER INDEX "public"."branch_members_userId_branchId_key" RENAME TO "library_members_userId_libraryId_key";
