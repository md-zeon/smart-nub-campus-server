-- AlterTable
ALTER TABLE "job_posts" ADD COLUMN "applicationForm" JSONB;

-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN "responses" JSONB;
