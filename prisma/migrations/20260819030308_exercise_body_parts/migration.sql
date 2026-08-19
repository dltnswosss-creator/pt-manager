-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "bodyParts" TEXT[] DEFAULT ARRAY[]::TEXT[];
