-- CreateEnum
CREATE TYPE "AcademicStatus" AS ENUM ('ENROLLED', 'GRADUATED');

-- CreateEnum
CREATE TYPE "VerificationRequestType" AS ENUM ('STUDENT', 'ALUMNI');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "MentorshipCadence" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "EventAudience" AS ENUM ('EVERYONE', 'STUDENTS_ONLY', 'ALUMNI_ONLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'GRADUATION_MARKED';
ALTER TYPE "NotificationType" ADD VALUE 'ALUMNI_TRANSITION_COMPLETE';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_APPLICATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_APPLICATION_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_REQUEST_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_SESSION_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_SESSION_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_GOAL_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_ENDED';
ALTER TYPE "NotificationType" ADD VALUE 'MENTORSHIP_REMINDER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReputationEvent" ADD VALUE 'COMMENT_UPLOADED';
ALTER TYPE "ReputationEvent" ADD VALUE 'COMMENT_UPVOTED_RECEIVED';
ALTER TYPE "ReputationEvent" ADD VALUE 'COMMENT_DOWNVOTED_RECEIVED';
ALTER TYPE "ReputationEvent" ADD VALUE 'COMMENT_DOWNVOTED_GIVEN';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ALUMNI';

-- AlterTable
ALTER TABLE "ai_chat_sessions" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "ai_messages" ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "outputTokens" INTEGER;

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "downvoteCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "upvoteCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "connections" ADD COLUMN     "connectedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "discussion_replies" ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "audience" "EventAudience" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "reunionBatchYear" INTEGER;

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "academicStatus" "AcademicStatus" NOT NULL DEFAULT 'ENROLLED',
ADD COLUMN     "cgpa" DECIMAL(4,2),
ADD COLUMN     "degreeTitle" TEXT,
ADD COLUMN     "graduatedAt" TIMESTAMP(3),
ADD COLUMN     "graduatedById" TEXT,
ADD COLUMN     "graduationDate" TIMESTAMP(3),
ADD COLUMN     "graduationSemester" "AdmissionSemester",
ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "transitionConfirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "team_requests" ADD COLUMN     "bookmarkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contactInfo" VARCHAR(500),
ADD COLUMN     "difficulty" "DifficultyLevel",
ADD COLUMN     "meetingPreference" "MeetingPreference" NOT NULL DEFAULT 'FLEXIBLE',
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "reputation" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "currentEmployer" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "isMentor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "mentorAvailability" TEXT,
ADD COLUMN     "mentorBio" TEXT,
ADD COLUMN     "mentorCadence" "MentorshipCadence",
ADD COLUMN     "mentorHeadline" TEXT,
ADD COLUMN     "mentorMaxMentees" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "mentorMeetingFormat" "MeetingPreference",
ADD COLUMN     "mentorshipTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "showInAlumniDirectory" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "verification_requests" ADD COLUMN     "degreeTitle" TEXT,
ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "requestType" "VerificationRequestType" NOT NULL DEFAULT 'STUDENT';

-- CreateTable
CREATE TABLE "ai_attachments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_reports" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_votes" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_bookmarks" (
    "id" TEXT NOT NULL,
    "teamRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_attachments_sessionId_idx" ON "ai_attachments"("sessionId");

-- CreateIndex
CREATE INDEX "discussion_reports_replyId_idx" ON "discussion_reports"("replyId");

-- CreateIndex
CREATE INDEX "discussion_reports_userId_idx" ON "discussion_reports"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_reports_replyId_userId_key" ON "discussion_reports"("replyId", "userId");

-- CreateIndex
CREATE INDEX "comment_votes_commentId_idx" ON "comment_votes"("commentId");

-- CreateIndex
CREATE INDEX "comment_votes_userId_idx" ON "comment_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "comment_votes_commentId_userId_key" ON "comment_votes"("commentId", "userId");

-- CreateIndex
CREATE INDEX "team_bookmarks_teamRequestId_idx" ON "team_bookmarks"("teamRequestId");

-- CreateIndex
CREATE INDEX "team_bookmarks_userId_idx" ON "team_bookmarks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_bookmarks_teamRequestId_userId_key" ON "team_bookmarks"("teamRequestId", "userId");

-- CreateIndex
CREATE INDEX "student_academicStatus_idx" ON "student"("academicStatus");

-- CreateIndex
CREATE INDEX "student_graduationYear_idx" ON "student"("graduationYear");

-- CreateIndex
CREATE INDEX "team_requests_category_idx" ON "team_requests"("category");

-- CreateIndex
CREATE INDEX "team_requests_difficulty_idx" ON "team_requests"("difficulty");

-- AddForeignKey
ALTER TABLE "ai_attachments" ADD CONSTRAINT "ai_attachments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reports" ADD CONSTRAINT "discussion_reports_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "discussion_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reports" ADD CONSTRAINT "discussion_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_graduatedById_fkey" FOREIGN KEY ("graduatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_bookmarks" ADD CONSTRAINT "team_bookmarks_teamRequestId_fkey" FOREIGN KEY ("teamRequestId") REFERENCES "team_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_bookmarks" ADD CONSTRAINT "team_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
