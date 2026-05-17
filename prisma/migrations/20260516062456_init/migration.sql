-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthDate" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "job" TEXT,
    "startDate" TEXT,
    "goal" TEXT,
    "exerciseLevel" TEXT,
    "exerciseHistory" TEXT,
    "medicalHistory" TEXT,
    "painAreas" TEXT,
    "medications" TEXT,
    "mealCount" INTEGER,
    "mealPattern" TEXT,
    "sleepHours" DOUBLE PRECISION,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'individual',
    "duration" INTEGER,
    "memo" TEXT,
    "notionPageId" TEXT,
    "notionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSession" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT,
    "memo" TEXT,
    "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notionPageId" TEXT,
    "notionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" TEXT,
    "weight" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "memo" TEXT,
    "videoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupExercise" (
    "id" SERIAL NOT NULL,
    "groupSessionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" TEXT,
    "weight" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "memo" TEXT,
    "videoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GroupExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenstrualCycle" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "lastStartDate" TEXT NOT NULL,
    "cycleLength" INTEGER NOT NULL DEFAULT 28,
    "periodLength" INTEGER NOT NULL DEFAULT 5,
    "memo" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenstrualCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenstrualCycle_clientId_key" ON "MenstrualCycle"("clientId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupExercise" ADD CONSTRAINT "GroupExercise_groupSessionId_fkey" FOREIGN KEY ("groupSessionId") REFERENCES "GroupSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenstrualCycle" ADD CONSTRAINT "MenstrualCycle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
