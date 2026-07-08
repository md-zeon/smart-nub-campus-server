/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `verification_requests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId]` on the table `verification_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OnboardingStepValue" AS ENUM ('VERIFICATION_FORM', 'ADMIN_REVIEW', 'ACCOUNT_CREATION', 'COMPLETED');

-- DropIndex
DROP INDEX "verification_requests_studentId_idx";

-- CreateTable
CREATE TABLE "onboarding_steps" (
    "id" TEXT NOT NULL,
    "verificationRequestId" TEXT NOT NULL,
    "step" "OnboardingStepValue" NOT NULL DEFAULT 'VERIFICATION_FORM',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_steps_verificationRequestId_key" ON "onboarding_steps"("verificationRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_requests_email_key" ON "verification_requests"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verification_requests_studentId_key" ON "verification_requests"("studentId");

-- AddForeignKey
ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_verificationRequestId_fkey" FOREIGN KEY ("verificationRequestId") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
