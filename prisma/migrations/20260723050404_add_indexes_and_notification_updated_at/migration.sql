-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "admin_department_idx" ON "admin"("department");

-- CreateIndex
CREATE INDEX "discussion_isSolved_idx" ON "discussion"("isSolved");

-- CreateIndex
CREATE INDEX "discussion_visibility_idx" ON "discussion"("visibility");

-- CreateIndex
CREATE INDEX "events_status_eventDate_idx" ON "events"("status", "eventDate");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "reputation_points_userId_source_idx" ON "reputation_points"("userId", "source");

-- CreateIndex
CREATE INDEX "resource_downloadCount_idx" ON "resource"("downloadCount" DESC);

-- CreateIndex
CREATE INDEX "resource_isDeleted_isVerified_idx" ON "resource"("isDeleted", "isVerified");

-- CreateIndex
CREATE INDEX "team_requests_deadline_idx" ON "team_requests"("deadline");

-- CreateIndex
CREATE INDEX "user_isDeleted_idx" ON "user"("isDeleted");
