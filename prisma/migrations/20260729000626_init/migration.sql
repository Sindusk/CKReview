-- CreateEnum
CREATE TYPE "StaticMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "Static" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" INTEGER NOT NULL,

    CONSTRAINT "Static_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticMember" (
    "id" SERIAL NOT NULL,
    "staticId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "StaticMemberRole" NOT NULL DEFAULT 'MEMBER',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaticMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticReview" (
    "id" SERIAL NOT NULL,
    "staticId" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reportUrl" TEXT NOT NULL,
    "label" TEXT,
    "addedByUserId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaticReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaticMember_userId_idx" ON "StaticMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StaticMember_staticId_userId_key" ON "StaticMember"("staticId", "userId");

-- CreateIndex
CREATE INDEX "StaticReview_staticId_idx" ON "StaticReview"("staticId");

-- CreateIndex
CREATE UNIQUE INDEX "StaticReview_staticId_sessionId_key" ON "StaticReview"("staticId", "sessionId");

-- AddForeignKey
ALTER TABLE "StaticMember" ADD CONSTRAINT "StaticMember_staticId_fkey" FOREIGN KEY ("staticId") REFERENCES "Static"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticReview" ADD CONSTRAINT "StaticReview_staticId_fkey" FOREIGN KEY ("staticId") REFERENCES "Static"("id") ON DELETE CASCADE ON UPDATE CASCADE;
