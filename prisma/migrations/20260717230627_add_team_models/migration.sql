-- CreateTable
CREATE TABLE "team_requests" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "lookingForCount" INTEGER NOT NULL,
    "currentMemberCount" INTEGER NOT NULL DEFAULT 1,
    "projectName" TEXT,
    "deadline" TIMESTAMP(3),
    "status" "TeamRequestStatus" NOT NULL DEFAULT 'OPEN',
    "creatorId" TEXT NOT NULL,
    "category" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_request_skills" (
    "id" TEXT NOT NULL,
    "teamRequestId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_request_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_applications" (
    "id" TEXT NOT NULL,
    "teamRequestId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_requests_creatorId_idx" ON "team_requests"("creatorId");

-- CreateIndex
CREATE INDEX "team_requests_status_idx" ON "team_requests"("status");

-- CreateIndex
CREATE INDEX "team_requests_createdAt_idx" ON "team_requests"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "team_request_skills_teamRequestId_idx" ON "team_request_skills"("teamRequestId");

-- CreateIndex
CREATE INDEX "team_request_skills_tagId_idx" ON "team_request_skills"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "team_request_skills_teamRequestId_tagId_key" ON "team_request_skills"("teamRequestId", "tagId");

-- CreateIndex
CREATE INDEX "team_applications_teamRequestId_idx" ON "team_applications"("teamRequestId");

-- CreateIndex
CREATE INDEX "team_applications_applicantId_idx" ON "team_applications"("applicantId");

-- CreateIndex
CREATE INDEX "team_applications_status_idx" ON "team_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "team_applications_teamRequestId_applicantId_key" ON "team_applications"("teamRequestId", "applicantId");

-- CreateIndex
CREATE INDEX "team_members_teamRequestId_idx" ON "team_members"("teamRequestId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamRequestId_userId_key" ON "team_members"("teamRequestId", "userId");

-- AddForeignKey
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_request_skills" ADD CONSTRAINT "team_request_skills_teamRequestId_fkey" FOREIGN KEY ("teamRequestId") REFERENCES "team_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_request_skills" ADD CONSTRAINT "team_request_skills_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_applications" ADD CONSTRAINT "team_applications_teamRequestId_fkey" FOREIGN KEY ("teamRequestId") REFERENCES "team_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_applications" ADD CONSTRAINT "team_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamRequestId_fkey" FOREIGN KEY ("teamRequestId") REFERENCES "team_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
