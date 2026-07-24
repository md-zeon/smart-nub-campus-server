-- CreateTable
CREATE TABLE "ai_chat_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "isHelpful" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_study_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "questionsAsked" INTEGER NOT NULL DEFAULT 0,
    "timeSpentMinutes" INTEGER NOT NULL DEFAULT 0,
    "topicsExplored" INTEGER NOT NULL DEFAULT 0,
    "quizzesGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_study_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_chat_sessions_userId_idx" ON "ai_chat_sessions"("userId");

-- CreateIndex
CREATE INDEX "ai_chat_sessions_createdAt_idx" ON "ai_chat_sessions"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_messages_sessionId_idx" ON "ai_messages"("sessionId");

-- CreateIndex
CREATE INDEX "ai_messages_createdAt_idx" ON "ai_messages"("createdAt");

-- CreateIndex
CREATE INDEX "ai_study_stats_userId_idx" ON "ai_study_stats"("userId");

-- CreateIndex
CREATE INDEX "ai_study_stats_weekStart_idx" ON "ai_study_stats"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "ai_study_stats_userId_weekStart_key" ON "ai_study_stats"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_study_stats" ADD CONSTRAINT "ai_study_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
