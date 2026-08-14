-- CreateTable
CREATE TABLE "MonthlyGoal" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "targetFrequency" INTEGER,
    "targetSets" INTEGER,
    "targetVolume" INTEGER,
    "intensityGuide" TEXT,
    "feedback" TEXT,
    "goalNote" TEXT,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyGoal_clientId_yearMonth_key" ON "MonthlyGoal"("clientId", "yearMonth");

-- AddForeignKey
ALTER TABLE "MonthlyGoal" ADD CONSTRAINT "MonthlyGoal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
