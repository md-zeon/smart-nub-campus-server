/*
  Warnings:

  - You are about to drop the `VerificationRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "VerificationRequest";

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "idCardImage" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_requests_studentId_idx" ON "verification_requests"("studentId");
