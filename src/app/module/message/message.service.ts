import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { notificationService } from "../notification/notification.service";
import {
  SendMessageInput,
  CreateGroupInput,
  UpdateGroupInput,
  GetConversationsQuery,
  GetMessagesQuery,
  ConversationWithDetails,
  MessageWithSender,
} from "./message.interface";

/**
 * Find or create a DIRECT conversation between two users.
 * Returns the existing conversation if one already exists between the two users.
 */
const findOrCreateConversation = async (
  userId: string,
  participantId: string,
): Promise<ConversationWithDetails> => {
  // Check if both users exist
  const participant = await prisma.user.findUnique({
    where: { id: participantId },
  });
  if (!participant) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  if (userId === participantId) {
    throw new AppError(status.BAD_REQUEST, "You cannot start a conversation with yourself.");
  }

  // Check if a DIRECT conversation already exists between these two users
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      type: "DIRECT",
      conversationParticipants: {
        every: {
          userId: { in: [userId, participantId] },
        },
      },
    },
    include: {
      conversationParticipants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  // If conversation exists and has exactly 2 participants (both users), return it
  if (
    existingConversation &&
    existingConversation.conversationParticipants.length === 2
  ) {
    // Calculate unread count for the current user
    const participant = existingConversation.conversationParticipants.find(
      (p) => p.userId === userId,
    );
    const lastReadAt = participant?.lastReadAt;

    const unreadCount = await prisma.message.count({
      where: {
        conversationId: existingConversation.id,
        createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
        senderId: { not: userId },
        isDeleted: false,
      },
    });

    // Get last message
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId: existingConversation.id, isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        senderId: true,
        createdAt: true,
      },
    });

    const otherParticipant = existingConversation.conversationParticipants.find(
      (p) => p.userId !== userId,
    );

    return {
      ...existingConversation,
      otherUser: otherParticipant?.user ?? null,
      lastMessage,
      unreadCount,
    };
  }

  // Create new DIRECT conversation
  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      conversationParticipants: {
        create: [
          { userId, isAdmin: false },
          { userId: participantId, isAdmin: false },
        ],
      },
    },
    include: {
      conversationParticipants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  const otherParticipant = conversation.conversationParticipants.find(
    (p) => p.userId !== userId,
  );

  return {
    ...conversation,
    otherUser: otherParticipant?.user ?? null,
    lastMessage: null,
    unreadCount: 0,
  };
};

/**
 * Get all conversations for a user, ordered by lastMessageAt descending.
 */
const getConversations = async (
  userId: string,
  query: GetConversationsQuery,
) => {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  // Get conversation IDs for the user
  const participantConversations = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  const conversationIds = participantConversations.map((p) => p.conversationId);

  if (conversationIds.length === 0) {
    return {
      data: [],
      meta: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const [conversations, total] = await prisma.$transaction([
    prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      skip,
      take: limit,
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      include: {
        conversationParticipants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    }),
    prisma.conversation.count({
      where: { id: { in: conversationIds } },
    }),
  ]);

  // Enrich conversations with last message and unread count
  const enrichedConversations: ConversationWithDetails[] = await Promise.all(
    conversations.map(async (conv) => {
      // Get last message
      const lastMessage = await prisma.message.findFirst({
        where: { conversationId: conv.id, isDeleted: false },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
        },
      });

      // Get unread count
      const myParticipant = conv.conversationParticipants.find(
        (p) => p.userId === userId,
      );
      const lastReadAt = myParticipant?.lastReadAt;

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
          senderId: { not: userId },
          isDeleted: false,
        },
      });

      // For DIRECT conversations, find the other user
      let otherUser: ConversationWithDetails["otherUser"] = null;
      if (conv.type === "DIRECT") {
        const otherParticipant = conv.conversationParticipants.find(
          (p) => p.userId !== userId,
        );
        otherUser = otherParticipant?.user ?? null;
      }

      return {
        ...conv,
        otherUser,
        lastMessage,
        unreadCount,
      };
    }),
  );

  return {
    data: enrichedConversations,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Get a single conversation by ID with participants.
 */
const getConversation = async (
  conversationId: string,
  userId: string,
): Promise<ConversationWithDetails> => {
  // Check if user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new AppError(status.FORBIDDEN, "You are not a participant in this conversation.");
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      conversationParticipants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    throw new AppError(status.NOT_FOUND, "Conversation not found.");
  }

  // Get last message
  const lastMessage = await prisma.message.findFirst({
    where: { conversationId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      senderId: true,
      createdAt: true,
    },
  });

  // Get unread count
  const lastReadAt = participant.lastReadAt;
  const unreadCount = await prisma.message.count({
    where: {
      conversationId,
      createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
      senderId: { not: userId },
      isDeleted: false,
    },
  });

  // For DIRECT conversations, find the other user
  let otherUser: ConversationWithDetails["otherUser"] = null;
  if (conversation.type === "DIRECT") {
    const otherParticipant = conversation.conversationParticipants.find(
      (p) => p.userId !== userId,
    );
    otherUser = otherParticipant?.user ?? null;
  }

  return {
    ...conversation,
    otherUser,
    lastMessage,
    unreadCount,
  };
};

/**
 * Send a message in a conversation.
 * Updates the conversation's lastMessageAt.
 */
const sendMessage = async (
  conversationId: string,
  data: SendMessageInput,
  userId: string,
): Promise<MessageWithSender> => {
  // Check if user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new AppError(status.FORBIDDEN, "You are not a participant in this conversation.");
  }

  // If replying to a message, verify the reply target exists in the same conversation
  if (data.replyToId) {
    const replyToMessage = await prisma.message.findUnique({
      where: { id: data.replyToId },
    });

    if (!replyToMessage || replyToMessage.conversationId !== conversationId) {
      throw new AppError(status.BAD_REQUEST, "Reply target message not found in this conversation.");
    }
  }

  // Create the message and update conversation's lastMessageAt in a transaction
  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: data.content,
        type: data.type || "TEXT",
        replyToId: data.replyToId,
        fileUrl: data.fileUrl,
        filePublicId: data.filePublicId,
        fileName: data.fileName,
        fileSize: data.fileSize,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Update conversation's lastMessageAt
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return newMessage;
  });

  // Notify other conversation participants (fire-and-forget)
  prisma.conversationParticipant
    .findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    })
    .then((participants) => {
      for (const p of participants) {
        notificationService.createNotification({
          userId: p.userId,
          type: "MESSAGE",
          title: "New Message",
          message: `You have a new message.`,
          link: `/messages/${conversationId}`,
        }).catch(() => {});
      }
    })
    .catch(() => {});

  return message;
};

/**
 * Get paginated messages within a conversation.
 */
const getMessages = async (
  conversationId: string,
  userId: string,
  query: GetMessagesQuery,
) => {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  // Check if user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new AppError(status.FORBIDDEN, "You are not a participant in this conversation.");
  }

  const where: Prisma.MessageWhereInput = {
    conversationId,
    isDeleted: false,
  };

  const [messages, total] = await prisma.$transaction([
    prisma.message.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.message.count({ where }),
  ]);

  return {
    data: messages,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Mark all messages in a conversation as read by updating the participant's lastReadAt.
 */
const markAsRead = async (conversationId: string, userId: string) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new AppError(status.FORBIDDEN, "You are not a participant in this conversation.");
  }

  // Update lastReadAt to current timestamp
  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    data: {
      lastReadAt: new Date(),
    },
  });

  return { message: "Messages marked as read." };
};

/**
 * Persist per-message read receipts for a conversation. Marks every message
 * sent by another participant (not the reader) that is still unread as read.
 * Returns the IDs of the messages that were actually updated so the caller
 * can broadcast read receipts to the sender(s).
 */
const markMessagesRead = async (
  conversationId: string,
  userId: string,
): Promise<{ messageIds: string[]; readAt: Date }> => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new AppError(status.FORBIDDEN, "You are not a participant in this conversation.");
  }

  const readAt = new Date();

  const unread = await prisma.message.findMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
      isDeleted: false,
    },
    select: { id: true },
  });

  const messageIds = unread.map((m) => m.id);

  if (messageIds.length > 0) {
    await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
      },
      data: {
        isRead: true,
        readAt,
      },
    });
  }

  return { messageIds, readAt };
};

/**
 * Create a group conversation with the creator as admin.
 */
const createGroup = async (
  data: CreateGroupInput,
  userId: string,
) => {
  // Validate that all participant IDs are valid users
  const participants = await prisma.user.findMany({
    where: {
      id: { in: data.participantIds },
    },
    select: { id: true },
  });

  if (participants.length !== data.participantIds.length) {
    throw new AppError(status.BAD_REQUEST, "One or more participants are invalid.");
  }

  // Create the group conversation with creator as admin
  const conversation = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: data.name,
      description: data.description,
      creatorId: userId,
      conversationParticipants: {
        create: [
          // Creator as admin
          { userId, isAdmin: true },
          // Other participants as regular members
          ...data.participantIds.map((participantId) => ({
            userId: participantId,
            isAdmin: false,
          })),
        ],
      },
    },
    include: {
      conversationParticipants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  return conversation;
};

/**
 * Update a group conversation's details (name, description, image).
 * Only group admins can update.
 */
const updateGroup = async (
  conversationId: string,
  data: UpdateGroupInput,
  userId: string,
) => {
  // Check if conversation exists and is a group
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(status.NOT_FOUND, "Conversation not found.");
  }

  if (conversation.type !== "GROUP") {
    throw new AppError(status.BAD_REQUEST, "This is not a group conversation.");
  }

  // Check if user is a group admin
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant || !participant.isAdmin) {
    throw new AppError(status.FORBIDDEN, "Only group admins can update the group.");
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.groupImage !== undefined && { groupImage: data.groupImage }),
    },
    include: {
      conversationParticipants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  return updated;
};

/**
 * Add members to a group conversation.
 * Only group admins can add members.
 */
const addMember = async (
  conversationId: string,
  data: { participantIds: string[] },
  userId: string,
) => {
  // Check if conversation exists and is a group
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(status.NOT_FOUND, "Conversation not found.");
  }

  if (conversation.type !== "GROUP") {
    throw new AppError(status.BAD_REQUEST, "This is not a group conversation.");
  }

  // Check if user is a group admin
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant || !participant.isAdmin) {
    throw new AppError(status.FORBIDDEN, "Only group admins can add members.");
  }

  // Validate that all participant IDs are valid users
  const users = await prisma.user.findMany({
    where: {
      id: { in: data.participantIds },
    },
    select: { id: true },
  });

  if (users.length !== data.participantIds.length) {
    throw new AppError(status.BAD_REQUEST, "One or more participants are invalid.");
  }

  // Check if any of the participants are already in the group
  const existingParticipants = await prisma.conversationParticipant.findMany({
    where: {
      conversationId,
      userId: { in: data.participantIds },
    },
    select: { userId: true },
  });

  const existingIds = existingParticipants.map((p) => p.userId);
  const newIds = data.participantIds.filter((id) => !existingIds.includes(id));

  if (newIds.length === 0) {
    throw new AppError(status.CONFLICT, "All users are already in this group.");
  }

  // Add new members
  await prisma.conversationParticipant.createMany({
    data: newIds.map((id) => ({
      conversationId,
      userId: id,
      isAdmin: false,
    })),
  });

  return { message: `${newIds.length} member(s) added successfully.` };
};

/**
 * Remove a member from a group conversation.
 * Only group admins can remove members.
 * Group creators cannot be removed.
 */
const removeMember = async (
  conversationId: string,
  memberId: string,
  userId: string,
) => {
  // Check if conversation exists and is a group
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(status.NOT_FOUND, "Conversation not found.");
  }

  if (conversation.type !== "GROUP") {
    throw new AppError(status.BAD_REQUEST, "This is not a group conversation.");
  }

  // Check if user is a group admin
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant || !participant.isAdmin) {
    throw new AppError(status.FORBIDDEN, "Only group admins can remove members.");
  }

  // Cannot remove the group creator
  if (conversation.creatorId === memberId) {
    throw new AppError(status.BAD_REQUEST, "The group creator cannot be removed.");
  }

  // Check if the member exists in the group
  const memberParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: memberId,
      },
    },
  });

  if (!memberParticipant) {
    throw new AppError(status.NOT_FOUND, "Member not found in this group.");
  }

  // Remove the member
  await prisma.conversationParticipant.delete({
    where: {
      conversationId_userId: {
        conversationId,
        userId: memberId,
      },
    },
  });

  return { message: "Member removed successfully." };
};

/**
 * Leave a group conversation.
 * The creator cannot leave a group they created.
 */
const leaveGroup = async (conversationId: string, userId: string) => {
  // Check if conversation exists and is a group
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(status.NOT_FOUND, "Conversation not found.");
  }

  if (conversation.type !== "GROUP") {
    throw new AppError(status.BAD_REQUEST, "This is not a group conversation.");
  }

  // Creator cannot leave
  if (conversation.creatorId === userId) {
    throw new AppError(
      status.BAD_REQUEST,
      "The group creator cannot leave. Delete the group instead.",
    );
  }

  // Check if user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new AppError(status.NOT_FOUND, "You are not a member of this group.");
  }

  // Remove the user from the group
  await prisma.conversationParticipant.delete({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  return { message: "You have left the group." };
};

/**
 * Get total unread count across all conversations for a user.
 */
const getUnreadCount = async (userId: string) => {
  // Get all conversations for the user with their lastReadAt
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  });

  if (participants.length === 0) {
    return { totalUnread: 0 };
  }

  // Calculate total unread messages across all conversations
  let totalUnread = 0;

  for (const participant of participants) {
    const unreadCount = await prisma.message.count({
      where: {
        conversationId: participant.conversationId,
        createdAt: participant.lastReadAt ? { gt: participant.lastReadAt } : undefined,
        senderId: { not: userId },
        isDeleted: false,
      },
    });
    totalUnread += unreadCount;
  }

  return { totalUnread };
};

/**
 * Get unread count for a specific conversation.
 */
const getConversationUnread = async (
  conversationId: string,
  userId: string,
) => {
  // Check if user is a participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new AppError(status.FORBIDDEN, "You are not a participant in this conversation.");
  }

  const unreadCount = await prisma.message.count({
    where: {
      conversationId,
      createdAt: participant.lastReadAt ? { gt: participant.lastReadAt } : undefined,
      senderId: { not: userId },
      isDeleted: false,
    },
  });

  return { unreadCount };
};

export const messageService = {
  findOrCreateConversation,
  getConversations,
  getConversation,
  sendMessage,
  getMessages,
  markAsRead,
  markMessagesRead,
  createGroup,
  updateGroup,
  addMember,
  removeMember,
  leaveGroup,
  getUnreadCount,
  getConversationUnread,
};
