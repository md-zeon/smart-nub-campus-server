-- AlterTable: Add fields to messages
ALTER TABLE "messages" ADD COLUMN "isEdited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN "editedAt" TIMESTAMP(3);
ALTER TABLE "messages" ADD COLUMN "isForwarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN "forwardedFromId" TEXT;

-- AlterTable: Add isPinned to conversation_participants
ALTER TABLE "conversation_participants" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: MessageReaction
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint
CREATE UNIQUE INDEX "message_reactions_messageId_userId_emoji_key" ON "message_reactions"("messageId", "userId", "emoji");

-- CreateIndex: Indexes
CREATE INDEX "message_reactions_messageId_idx" ON "message_reactions"("messageId");
CREATE INDEX "message_reactions_userId_idx" ON "message_reactions"("userId");

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
