-- AlterTable - Remove libraryId column from items table since we're moving to many-to-many relationship
ALTER TABLE "items" DROP COLUMN "libraryId";

-- CreateTable - Create item_libraries mapping table
CREATE TABLE "item_libraries" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_libraries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex - Create unique constraint on itemId, libraryId combination
CREATE UNIQUE INDEX "item_libraries_itemId_libraryId_key" ON "item_libraries"("itemId", "libraryId");

-- AddForeignKey - Add foreign key constraints to the mapping table
ALTER TABLE "item_libraries" ADD CONSTRAINT "item_libraries_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "item_libraries" ADD CONSTRAINT "item_libraries_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
