-- AlterTable: add as nullable first so existing rows can be backfilled,
-- then tighten to NOT NULL. Placeholder backfill values get overwritten by
-- the next "Resync" of each existing review anyway (see
-- lib/static-review-data.ts / the reviews route's resync path).
ALTER TABLE "StaticReviewPull" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "game" TEXT,
ADD COLUMN     "raidErrorAtMs" INTEGER;

UPDATE "StaticReviewPull" SET
  "durationMs" = GREATEST(("endTime" - "startTime") * 1000, 0),
  "game" = 'ffxiv'
WHERE "durationMs" IS NULL;

ALTER TABLE "StaticReviewPull" ALTER COLUMN "durationMs" SET NOT NULL;
ALTER TABLE "StaticReviewPull" ALTER COLUMN "game" SET NOT NULL;

-- AlterTable
ALTER TABLE "StaticReviewPullPlayerError" ADD COLUMN     "className" TEXT,
ADD COLUMN     "identityId" INTEGER,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "specId" INTEGER;

-- CreateTable
CREATE TABLE "StaticPlayerIdentity" (
    "id" SERIAL NOT NULL,
    "staticId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaticPlayerIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticPlayerAlias" (
    "id" SERIAL NOT NULL,
    "staticId" INTEGER NOT NULL,
    "identityId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "StaticPlayerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaticPlayerIdentity_staticId_idx" ON "StaticPlayerIdentity"("staticId");

-- CreateIndex
CREATE INDEX "StaticPlayerAlias_identityId_idx" ON "StaticPlayerAlias"("identityId");

-- CreateIndex
CREATE UNIQUE INDEX "StaticPlayerAlias_staticId_name_key" ON "StaticPlayerAlias"("staticId", "name");

-- CreateIndex
CREATE INDEX "StaticReviewPullPlayerError_identityId_idx" ON "StaticReviewPullPlayerError"("identityId");

-- AddForeignKey
ALTER TABLE "StaticReviewPullPlayerError" ADD CONSTRAINT "StaticReviewPullPlayerError_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "StaticPlayerIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticPlayerIdentity" ADD CONSTRAINT "StaticPlayerIdentity_staticId_fkey" FOREIGN KEY ("staticId") REFERENCES "Static"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticPlayerAlias" ADD CONSTRAINT "StaticPlayerAlias_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "StaticPlayerIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticPlayerAlias" ADD CONSTRAINT "StaticPlayerAlias_staticId_fkey" FOREIGN KEY ("staticId") REFERENCES "Static"("id") ON DELETE CASCADE ON UPDATE CASCADE;
