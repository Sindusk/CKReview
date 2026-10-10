-- CreateTable: log names deleted from a static's sessions via the Players
-- panel, so resyncing those sessions keeps their pulls out.
CREATE TABLE "StaticExcludedPlayer" (
    "id" SERIAL NOT NULL,
    "staticId" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaticExcludedPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaticExcludedPlayer_staticId_sessionId_name_key" ON "StaticExcludedPlayer"("staticId", "sessionId", "name");

-- AddForeignKey
ALTER TABLE "StaticExcludedPlayer" ADD CONSTRAINT "StaticExcludedPlayer_staticId_fkey" FOREIGN KEY ("staticId") REFERENCES "Static"("id") ON DELETE CASCADE ON UPDATE CASCADE;
