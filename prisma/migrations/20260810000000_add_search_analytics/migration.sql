-- CreateTable
CREATE TABLE "search_analytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" VARCHAR(120) NOT NULL,
    "entityTotals" JSONB,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "zeroResult" BOOLEAN NOT NULL DEFAULT false,
    "tookMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_clicks" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" VARCHAR(120) NOT NULL,
    "entity" VARCHAR(32) NOT NULL,
    "resultId" TEXT,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_analytics_userId_idx" ON "search_analytics"("userId");

-- CreateIndex
CREATE INDEX "search_analytics_createdAt_idx" ON "search_analytics"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "search_analytics_zeroResult_idx" ON "search_analytics"("zeroResult");

-- CreateIndex
CREATE INDEX "search_clicks_userId_idx" ON "search_clicks"("userId");

-- CreateIndex
CREATE INDEX "search_clicks_createdAt_idx" ON "search_clicks"("createdAt" DESC);
