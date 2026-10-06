-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('DEVELOPMENT', 'BUSINESS', 'CAREER', 'ADMINISTRATIVE');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" "TaskCategory" NOT NULL DEFAULT 'DEVELOPMENT';

-- CreateIndex
CREATE INDEX "Task_userId_category_completedAt_idx" ON "Task"("userId", "category", "completedAt");

-- Backfill: classify existing tickets from their type
UPDATE "Task" SET "category" = 'BUSINESS' WHERE "type" = 'BUSINESS';
UPDATE "Task" SET "category" = 'CAREER' WHERE "type" = 'CAREER';

-- Sprint 00 tickets were onboarding/foundation work, not development productivity
UPDATE "Task" SET "category" = 'ADMINISTRATIVE'
WHERE "sprintId" IN (SELECT "id" FROM "Sprint" WHERE "name" LIKE 'Sprint 00%');
