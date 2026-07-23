/*
  Warnings:

  - You are about to drop the column `adminUserId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `targetType` on the `audit_logs` table. All the data in the column will be lost.
  - Added the required column `entityId` to the `audit_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_adminUserId_fkey";

-- DropIndex
DROP INDEX "audit_logs_adminUserId_idx";

-- DropIndex
DROP INDEX "audit_logs_targetType_targetId_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "adminUserId",
DROP COLUMN "targetId",
DROP COLUMN "targetType",
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "entityType" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showProfile" "ProfileVisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
    "showAcademicInfo" "ProfileVisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
    "showSkills" "ProfileVisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
    "showProjects" "ProfileVisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
    "showReputation" "ProfileVisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
    "showBadges" "ProfileVisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
    "showSocialLinks" "ProfileVisibilityLevel" NOT NULL DEFAULT 'EVERYONE',
    "connectionRequestPolicy" "ConnectionRequestPolicy" NOT NULL DEFAULT 'EVERYONE',
    "messagingPolicy" "MessagingPolicy" NOT NULL DEFAULT 'EVERYONE',
    "allowMessageRequests" BOOLEAN NOT NULL DEFAULT true,
    "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
    "showLastActive" BOOLEAN NOT NULL DEFAULT true,
    "readReceipts" BOOLEAN NOT NULL DEFAULT true,
    "searchableProfile" BOOLEAN NOT NULL DEFAULT true,
    "appearInRecommendations" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourcesInApp" BOOLEAN NOT NULL DEFAULT true,
    "resourcesEmail" BOOLEAN NOT NULL DEFAULT false,
    "discussionsInApp" BOOLEAN NOT NULL DEFAULT true,
    "discussionsEmail" BOOLEAN NOT NULL DEFAULT false,
    "qaInApp" BOOLEAN NOT NULL DEFAULT true,
    "qaEmail" BOOLEAN NOT NULL DEFAULT false,
    "messagingInApp" BOOLEAN NOT NULL DEFAULT true,
    "messagingEmail" BOOLEAN NOT NULL DEFAULT false,
    "networkInApp" BOOLEAN NOT NULL DEFAULT true,
    "networkEmail" BOOLEAN NOT NULL DEFAULT false,
    "teamsInApp" BOOLEAN NOT NULL DEFAULT true,
    "teamsEmail" BOOLEAN NOT NULL DEFAULT false,
    "adminInApp" BOOLEAN NOT NULL DEFAULT true,
    "adminEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_settings_userId_key" ON "user_notification_settings"("userId");

-- CreateIndex
CREATE INDEX "login_history_userId_idx" ON "login_history"("userId");

-- CreateIndex
CREATE INDEX "login_history_createdAt_idx" ON "login_history"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "export_jobs_userId_idx" ON "export_jobs"("userId");

-- CreateIndex
CREATE INDEX "export_jobs_status_idx" ON "export_jobs"("status");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
