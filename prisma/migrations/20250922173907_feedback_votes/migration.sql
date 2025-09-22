-- CreateTable
CREATE TABLE "public"."feedback_votes" (
    "id" TEXT NOT NULL,
    "issueNumber" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_votes_issueNumber_idx" ON "public"."feedback_votes"("issueNumber");

-- CreateIndex
CREATE INDEX "feedback_votes_userId_idx" ON "public"."feedback_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_votes_issueNumber_userId_key" ON "public"."feedback_votes"("issueNumber", "userId");

-- AddForeignKey
ALTER TABLE "public"."feedback_votes" ADD CONSTRAINT "feedback_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
