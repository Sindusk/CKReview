-- Per-player exposure (docs/exposure-plan.md): a targeted or assigned
-- mechanic instance records its responsible players. Purely additive;
-- sessions imported before keep counting every player at every instance
-- until resynced (detailVersion 2).

-- AlterTable
ALTER TABLE "StaticReviewPullMechanic" ADD COLUMN     "exposure" TEXT;

-- CreateTable
CREATE TABLE "StaticReviewPullMechanicPlayer" (
    "id" SERIAL NOT NULL,
    "mechanicId" INTEGER NOT NULL,
    "identityId" INTEGER,
    "player" TEXT NOT NULL,

    CONSTRAINT "StaticReviewPullMechanicPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaticReviewPullMechanicPlayer_mechanicId_idx" ON "StaticReviewPullMechanicPlayer"("mechanicId");

-- CreateIndex
CREATE INDEX "StaticReviewPullMechanicPlayer_identityId_idx" ON "StaticReviewPullMechanicPlayer"("identityId");

-- AddForeignKey
ALTER TABLE "StaticReviewPullMechanicPlayer" ADD CONSTRAINT "StaticReviewPullMechanicPlayer_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "StaticReviewPullMechanic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticReviewPullMechanicPlayer" ADD CONSTRAINT "StaticReviewPullMechanicPlayer_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "StaticPlayerIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
