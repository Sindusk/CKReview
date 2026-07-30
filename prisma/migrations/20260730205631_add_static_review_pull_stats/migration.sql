-- CreateTable
CREATE TABLE "StaticReviewPull" (
    "id" SERIAL NOT NULL,
    "staticReviewId" INTEGER NOT NULL,
    "fightId" INTEGER NOT NULL,
    "pullNumber" INTEGER NOT NULL,
    "bossName" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaticReviewPull_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticReviewPullPlayerError" (
    "id" SERIAL NOT NULL,
    "pullId" INTEGER NOT NULL,
    "player" TEXT NOT NULL,
    "majorCount" INTEGER NOT NULL DEFAULT 0,
    "minorCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StaticReviewPullPlayerError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaticReviewPull_staticReviewId_idx" ON "StaticReviewPull"("staticReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "StaticReviewPull_staticReviewId_fightId_key" ON "StaticReviewPull"("staticReviewId", "fightId");

-- CreateIndex
CREATE INDEX "StaticReviewPullPlayerError_pullId_idx" ON "StaticReviewPullPlayerError"("pullId");

-- CreateIndex
CREATE UNIQUE INDEX "StaticReviewPullPlayerError_pullId_player_key" ON "StaticReviewPullPlayerError"("pullId", "player");

-- AddForeignKey
ALTER TABLE "StaticReviewPull" ADD CONSTRAINT "StaticReviewPull_staticReviewId_fkey" FOREIGN KEY ("staticReviewId") REFERENCES "StaticReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticReviewPullPlayerError" ADD CONSTRAINT "StaticReviewPullPlayerError_pullId_fkey" FOREIGN KEY ("pullId") REFERENCES "StaticReviewPull"("id") ON DELETE CASCADE ON UPDATE CASCADE;
