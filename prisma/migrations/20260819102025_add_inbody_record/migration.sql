-- CreateTable
CREATE TABLE "InBodyRecord" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "skeletalMuscleMass" DOUBLE PRECISION,
    "bodyFatMass" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "bmr" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InBodyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InBodyRecord_clientId_date_key" ON "InBodyRecord"("clientId", "date");

-- AddForeignKey
ALTER TABLE "InBodyRecord" ADD CONSTRAINT "InBodyRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
