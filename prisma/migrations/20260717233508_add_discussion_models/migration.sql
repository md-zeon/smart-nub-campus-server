-- CreateTable
CREATE TABLE "discussion_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "courseId" TEXT,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "visibility" "DiscussionVisibility" NOT NULL DEFAULT 'PUBLIC',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isSolved" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_replies" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_votes" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_reply_votes" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_reply_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_tags" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_bookmarks" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discussion_categories_name_key" ON "discussion_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_categories_slug_key" ON "discussion_categories"("slug");

-- CreateIndex
CREATE INDEX "discussion_categoryId_idx" ON "discussion"("categoryId");

-- CreateIndex
CREATE INDEX "discussion_authorId_idx" ON "discussion"("authorId");

-- CreateIndex
CREATE INDEX "discussion_createdAt_idx" ON "discussion"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "discussion_upvoteCount_idx" ON "discussion"("upvoteCount" DESC);

-- CreateIndex
CREATE INDEX "discussion_replies_discussionId_idx" ON "discussion_replies"("discussionId");

-- CreateIndex
CREATE INDEX "discussion_replies_authorId_idx" ON "discussion_replies"("authorId");

-- CreateIndex
CREATE INDEX "discussion_replies_parentId_idx" ON "discussion_replies"("parentId");

-- CreateIndex
CREATE INDEX "discussion_votes_discussionId_idx" ON "discussion_votes"("discussionId");

-- CreateIndex
CREATE INDEX "discussion_votes_userId_idx" ON "discussion_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_votes_discussionId_userId_key" ON "discussion_votes"("discussionId", "userId");

-- CreateIndex
CREATE INDEX "discussion_reply_votes_replyId_idx" ON "discussion_reply_votes"("replyId");

-- CreateIndex
CREATE INDEX "discussion_reply_votes_userId_idx" ON "discussion_reply_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_reply_votes_replyId_userId_key" ON "discussion_reply_votes"("replyId", "userId");

-- CreateIndex
CREATE INDEX "discussion_tags_discussionId_idx" ON "discussion_tags"("discussionId");

-- CreateIndex
CREATE INDEX "discussion_tags_tagId_idx" ON "discussion_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_tags_discussionId_tagId_key" ON "discussion_tags"("discussionId", "tagId");

-- CreateIndex
CREATE INDEX "discussion_bookmarks_userId_idx" ON "discussion_bookmarks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_bookmarks_discussionId_userId_key" ON "discussion_bookmarks"("discussionId", "userId");

-- AddForeignKey
ALTER TABLE "discussion" ADD CONSTRAINT "discussion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "discussion_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion" ADD CONSTRAINT "discussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion" ADD CONSTRAINT "discussion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "discussion_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_votes" ADD CONSTRAINT "discussion_votes_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_votes" ADD CONSTRAINT "discussion_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reply_votes" ADD CONSTRAINT "discussion_reply_votes_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "discussion_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_reply_votes" ADD CONSTRAINT "discussion_reply_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_tags" ADD CONSTRAINT "discussion_tags_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_tags" ADD CONSTRAINT "discussion_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_bookmarks" ADD CONSTRAINT "discussion_bookmarks_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_bookmarks" ADD CONSTRAINT "discussion_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
