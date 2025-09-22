-- CreateTable
CREATE TABLE "public"."deploy_markers" (
    "id" TEXT NOT NULL,
    "env" TEXT NOT NULL,
    "lastSha" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deploy_markers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deploy_markers_env_key" ON "public"."deploy_markers"("env");
