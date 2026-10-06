-- Detailed tracking for statics (docs/static-player-analysis-plan.md):
-- per-error rows, phase segments, mechanic occurrences, the wipe cause, and
-- the rule/phase lookups they reference. Purely additive. Existing reviews
-- keep detailVersion NULL and only their count rows; they gain detail rows
-- the next time they are resynced.

-- AlterTable
ALTER TABLE "StaticReview" ADD COLUMN     "detailVersion" INTEGER;

-- AlterTable
ALTER TABLE "StaticReviewPull" ADD COLUMN     "endCauseAbility" TEXT,
ADD COLUMN     "endCauseAtMs" INTEGER,
ADD COLUMN     "endCauseKind" TEXT,
ADD COLUMN     "endCausePhase" INTEGER,
ADD COLUMN     "endCauseRuleId" INTEGER,
ADD COLUMN     "lastPhase" INTEGER;

-- CreateTable
CREATE TABLE "StaticRule" (
    "id" SERIAL NOT NULL,
    "staticId" INTEGER NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mechanicKey" TEXT NOT NULL,
    "mechanicLabel" TEXT NOT NULL,
    "phaseHint" INTEGER,

    CONSTRAINT "StaticRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticPhase" (
    "id" SERIAL NOT NULL,
    "staticId" INTEGER NOT NULL,
    "bossName" TEXT NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isIntermission" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StaticPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticReviewPullError" (
    "id" SERIAL NOT NULL,
    "pullId" INTEGER NOT NULL,
    "identityId" INTEGER,
    "player" TEXT,
    "ruleRefId" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "phase" INTEGER,
    "occurrence" INTEGER,
    "afterCutoff" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StaticReviewPullError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticReviewPullPhase" (
    "id" SERIAL NOT NULL,
    "pullId" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "phase" INTEGER NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,

    CONSTRAINT "StaticReviewPullPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticReviewPullMechanic" (
    "id" SERIAL NOT NULL,
    "pullId" INTEGER NOT NULL,
    "mechanicKey" TEXT NOT NULL,
    "occurrence" INTEGER NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "phase" INTEGER,

    CONSTRAINT "StaticReviewPullMechanic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaticRule_staticId_ruleKey_key" ON "StaticRule"("staticId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "StaticPhase_staticId_bossName_phaseId_key" ON "StaticPhase"("staticId", "bossName", "phaseId");

-- CreateIndex
CREATE INDEX "StaticReviewPullError_pullId_idx" ON "StaticReviewPullError"("pullId");

-- CreateIndex
CREATE INDEX "StaticReviewPullError_identityId_idx" ON "StaticReviewPullError"("identityId");

-- CreateIndex
CREATE INDEX "StaticReviewPullError_ruleRefId_idx" ON "StaticReviewPullError"("ruleRefId");

-- CreateIndex
CREATE UNIQUE INDEX "StaticReviewPullPhase_pullId_seq_key" ON "StaticReviewPullPhase"("pullId", "seq");

-- CreateIndex
CREATE INDEX "StaticReviewPullMechanic_pullId_idx" ON "StaticReviewPullMechanic"("pullId");

-- AddForeignKey
ALTER TABLE "StaticReviewPull" ADD CONSTRAINT "StaticReviewPull_endCauseRuleId_fkey" FOREIGN KEY ("endCauseRuleId") REFERENCES "StaticRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticRule" ADD CONSTRAINT "StaticRule_staticId_fkey" FOREIGN KEY ("staticId") REFERENCES "Static"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticPhase" ADD CONSTRAINT "StaticPhase_staticId_fkey" FOREIGN KEY ("staticId") REFERENCES "Static"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticReviewPullError" ADD CONSTRAINT "StaticReviewPullError_pullId_fkey" FOREIGN KEY ("pullId") REFERENCES "StaticReviewPull"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticReviewPullError" ADD CONSTRAINT "StaticReviewPullError_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "StaticPlayerIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticReviewPullError" ADD CONSTRAINT "StaticReviewPullError_ruleRefId_fkey" FOREIGN KEY ("ruleRefId") REFERENCES "StaticRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticReviewPullPhase" ADD CONSTRAINT "StaticReviewPullPhase_pullId_fkey" FOREIGN KEY ("pullId") REFERENCES "StaticReviewPull"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticReviewPullMechanic" ADD CONSTRAINT "StaticReviewPullMechanic_pullId_fkey" FOREIGN KEY ("pullId") REFERENCES "StaticReviewPull"("id") ON DELETE CASCADE ON UPDATE CASCADE;

