-- Add videoUrls array columns
ALTER TABLE "Exercise" ADD COLUMN "videoUrls" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "GroupExercise" ADD COLUMN "videoUrls" TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing single video URLs into the new array column
UPDATE "Exercise" SET "videoUrls" = ARRAY["videoUrl"] WHERE "videoUrl" IS NOT NULL;
UPDATE "GroupExercise" SET "videoUrls" = ARRAY["videoUrl"] WHERE "videoUrl" IS NOT NULL;

-- Drop old single video URL columns
ALTER TABLE "Exercise" DROP COLUMN "videoUrl";
ALTER TABLE "GroupExercise" DROP COLUMN "videoUrl";
