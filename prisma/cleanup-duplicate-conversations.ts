/**
 * Cleanup script for duplicate DIRECT conversations.
 *
 * Background: the client previously had a double-tap bug that created several
 * conversations between the same two people. This script finds DIRECT
 * conversation pairs that share the same two participants, keeps the oldest
 * conversation, moves all messages into it, and removes the duplicates.
 *
 * Usage:
 *   npx tsx prisma/cleanup-duplicate-conversations.ts        # dry-run report
 *   npx tsx prisma/cleanup-duplicate-conversations.ts --apply  # execute
 */
import { prisma } from "../src/app/lib/prisma";

const APPLY = process.argv.includes("--apply");

interface ConversationRow {
  id: string;
  createdAt: Date;
  lastMessageAt: Date | null;
  conversationParticipants: { userId: string }[];
}

function pairKey(userIds: string[]): string {
  return [...userIds].sort().join("|");
}

async function main() {
  const conversations = await prisma.conversation.findMany({
    where: { type: "DIRECT" },
    select: {
      id: true,
      createdAt: true,
      lastMessageAt: true,
      conversationParticipants: { select: { userId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, ConversationRow[]>();
  for (const convo of conversations) {
    const participants = convo.conversationParticipants.map((p) => p.userId);
    if (participants.length !== 2) continue;
    const key = pairKey(participants);
    const list = groups.get(key) ?? [];
    list.push(convo);
    groups.set(key, list);
  }

  const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);

  let removedConversations = 0;
  let movedMessages = 0;

  for (const group of duplicateGroups) {
    const [keep, ...dups] = group;

    let dupMessages = 0;
    for (const dup of dups) {
      if (APPLY) {
        const res = await prisma.message.updateMany({
          where: { conversationId: dup.id },
          data: { conversationId: keep.id },
        });
        dupMessages += res.count;
      } else {
        dupMessages += await prisma.message.count({
          where: { conversationId: dup.id },
        });
      }
    }

    let lastMessageAt = keep.lastMessageAt;
    if (dupMessages > 0 || lastMessageAt === null) {
      const latest = await prisma.message.findFirst({
        where: { conversationId: keep.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (latest) lastMessageAt = latest.createdAt;
    }

    if (APPLY) {
      await prisma.conversation.update({
        where: { id: keep.id },
        data: { lastMessageAt },
      });
      await prisma.conversation.deleteMany({
        where: { id: { in: dups.map((d) => d.id) } },
      });
    }

    removedConversations += dups.length;
    movedMessages += dupMessages;

    console.log(
      `pair ${pairKey([keep.conversationParticipants[0].userId, keep.conversationParticipants[1].userId])}: ` +
        `${dups.length} duplicate conversation(s) merged into ${keep.id} ` +
        `(kept), ${dupMessages} message(s) moved.`,
    );
  }

  if (!APPLY) {
    console.log("\nDRY-RUN: no changes were made. Re-run with --apply to execute.");
  }

  const totalConversations = await prisma.conversation.count();
  const totalMessages = await prisma.message.count();
  console.log(
    `Summary: ${duplicateGroups.length} duplicate pair(s), ` +
      `${removedConversations} conversation(s) would be removed, ` +
      `${movedMessages} message(s) moved. ` +
      `Totals after: ${totalConversations} conversations, ${totalMessages} messages.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
