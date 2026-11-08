-- CreateTable: waymark presets a user imported for a fight's replay
-- (WaymarkPresetPlugin JSON), and which waymarks Auto shows them per fight.
CREATE TABLE "UserWaymarkPreset" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fightKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marks" JSONB NOT NULL,
    "mapId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWaymarkPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWaymarkDefault" (
    "userId" INTEGER NOT NULL,
    "fightKey" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWaymarkDefault_pkey" PRIMARY KEY ("userId","fightKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserWaymarkPreset_userId_fightKey_name_key" ON "UserWaymarkPreset"("userId", "fightKey", "name");
