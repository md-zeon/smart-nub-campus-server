-- AlterTable
ALTER TABLE "discussion" ADD COLUMN "solutionReplyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "discussion_solutionReplyId_key" ON "discussion"("solutionReplyId");

-- AddForeignKey
ALTER TABLE "discussion" ADD CONSTRAINT "discussion_solutionReplyId_fkey" FOREIGN KEY ("solutionReplyId") REFERENCES "discussion_replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
