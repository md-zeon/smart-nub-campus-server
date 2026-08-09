-- AlterTable
ALTER TABLE "team_requests" ADD COLUMN     "applicationForm" JSONB;

-- AlterTable
ALTER TABLE "team_applications" ADD COLUMN     "responses" JSONB;
