-- CreateEnum
CREATE TYPE "public"."ItemConceptStatus" AS ENUM ('PENDING', 'READY', 'CONSUMED', 'EXPIRED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "public"."ConceptSourceType" AS ENUM ('OPENVERSE', 'GENERATIVE');

-- CreateTable
CREATE TABLE "public"."item_concepts" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "inputName" TEXT,
    "inputDescription" TEXT,
    "inputBrand" TEXT,
    "generatedName" TEXT,
    "generatedDetails" JSONB,
    "sourceType" "public"."ConceptSourceType" NOT NULL,
    "sourceAttribution" JSONB,
    "originalImageUrl" TEXT,
    "watercolorUrl" TEXT,
    "watercolorThumbUrl" TEXT,
    "status" "public"."ItemConceptStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT,

    CONSTRAINT "item_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_concepts_ownerId_idx" ON "public"."item_concepts"("ownerId");

-- CreateIndex
CREATE INDEX "item_concepts_batchId_idx" ON "public"."item_concepts"("batchId");

-- CreateIndex
CREATE INDEX "item_concepts_status_idx" ON "public"."item_concepts"("status");

-- CreateIndex
CREATE INDEX "item_concepts_expiresAt_idx" ON "public"."item_concepts"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."item_concepts" ADD CONSTRAINT "item_concepts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."item_concepts" ADD CONSTRAINT "item_concepts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
