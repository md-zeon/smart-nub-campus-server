import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    conversation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    conversationParticipant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    messageRead: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { messageService } from "../message.service";

const userId = "user-001";
const otherUserId = "user-002";
const conversationId = "conv-001";
const messageId = "msg-001";

function mockTxCallback() {
  mockPrisma.$transaction.mockImplementation(async (fns: any) => {
    if (Array.isArray(fns)) {
      return Promise.all(fns);
    }
    return fns(mockPrisma);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTxCallback();
});

const mockParticipant = {
  id: "part-1",
  conversationId,
  userId,
  isAdmin: false,
  lastReadAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOtherParticipant = {
  id: "part-2",
  conversationId,
  userId: otherUserId,
  isAdmin: false,
  lastReadAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser1 = { id: userId, name: "Alice", image: null };
const mockUser2 = { id: otherUserId, name: "Bob", image: null };

const mockConversation = {
  id: conversationId,
  type: "DIRECT",
  name: null,
  description: null,
  groupImage: null,
  creatorId: null,
  lastMessageAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  conversationParticipants: [
    { ...mockParticipant, user: mockUser1 },
    { ...mockOtherParticipant, user: mockUser2 },
  ],
};

const mockMessage = {
  id: messageId,
  conversationId,
  senderId: userId,
  content: "Hello!",
  type: "TEXT",
  replyToId: null,
  fileUrl: null,
  filePublicId: null,
  fileName: null,
  fileSize: null,
  isDeleted: false,
  isRead: false,
  readAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  sender: mockUser1,
  replyTo: null,
};

// ─── findOrCreateConversation ───────────────────────────────────────────────

describe("findOrCreateConversation", () => {
  it("creates a new direct conversation", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: otherUserId } as any);
    vi.mocked(mockPrisma.conversation.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.conversation.create).mockResolvedValue(mockConversation as any);

    const result = await messageService.findOrCreateConversation(userId, otherUserId);

    expect(result.type).toBe("DIRECT");
    expect(result.otherUser?.id).toBe(otherUserId);
    expect(result.unreadCount).toBe(0);
    expect(result.lastMessage).toBeNull();
    expect(mockPrisma.conversation.create).toHaveBeenCalledOnce();
  });

  it("returns existing direct conversation when one already exists", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: otherUserId } as any);
    vi.mocked(mockPrisma.conversation.findFirst).mockResolvedValue(mockConversation as any);
    vi.mocked(mockPrisma.message.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.message.findFirst).mockResolvedValue(null);

    const result = await messageService.findOrCreateConversation(userId, otherUserId);

    expect(result.id).toBe(conversationId);
    expect(result.otherUser?.id).toBe(otherUserId);
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
  });

  it("calculates unread count for existing conversation", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: otherUserId } as any);
    vi.mocked(mockPrisma.conversation.findFirst).mockResolvedValue(mockConversation as any);
    vi.mocked(mockPrisma.message.count).mockResolvedValue(3);
    vi.mocked(mockPrisma.message.findFirst).mockResolvedValue({
      id: "last-msg",
      content: "Latest",
      senderId: otherUserId,
      createdAt: new Date(),
    });

    const result = await messageService.findOrCreateConversation(userId, otherUserId);

    expect(result.unreadCount).toBe(3);
    expect(result.lastMessage?.content).toBe("Latest");
  });

  it("throws NOT_FOUND when other user does not exist", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

    await expect(
      messageService.findOrCreateConversation(userId, "nonexistent"),
    ).rejects.toThrow("User not found.");
  });

  it("throws BAD_REQUEST when trying to start conversation with self", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: userId } as any);

    await expect(
      messageService.findOrCreateConversation(userId, userId),
    ).rejects.toThrow("You cannot start a conversation with yourself.");
  });
});

// ─── getConversations ───────────────────────────────────────────────────────

describe("getConversations", () => {
  it("returns paginated conversations", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findMany).mockResolvedValue([
      { conversationId },
    ] as any);

    const enrichedConv = {
      ...mockConversation,
      otherUser: mockUser2,
      lastMessage: { id: "msg-1", content: "Hi", senderId: otherUserId, createdAt: new Date() },
      unreadCount: 2,
    };
    (mockPrisma.$transaction as any).mockResolvedValue([[enrichedConv], 1]);
    vi.mocked(mockPrisma.message.findFirst).mockResolvedValue(enrichedConv.lastMessage as any);
    vi.mocked(mockPrisma.message.count).mockResolvedValue(2);

    const result = await messageService.getConversations(userId, {});

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 20, total: 1 }),
    );
  });

  it("returns empty result when user has no conversations", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findMany).mockResolvedValue([]);

    const result = await messageService.getConversations(userId, {});

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it("applies custom page and limit", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findMany).mockResolvedValue([
      { conversationId },
    ] as any);
    (mockPrisma.$transaction as any).mockResolvedValue([[], 0]);

    const result = await messageService.getConversations(userId, { page: 2, limit: 10 });

    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(10);
  });

  it("enriches DIRECT conversations with otherUser", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findMany).mockResolvedValue([
      { conversationId },
    ] as any);

    const enrichedConv = {
      ...mockConversation,
      conversationParticipants: [
        { ...mockParticipant, user: mockUser1 },
        { ...mockOtherParticipant, user: mockUser2 },
      ],
    };
    (mockPrisma.$transaction as any).mockResolvedValue([[enrichedConv], 1]);
    vi.mocked(mockPrisma.message.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.message.count).mockResolvedValue(0);

    const result = await messageService.getConversations(userId, {});

    expect(result.data[0].otherUser?.id).toBe(otherUserId);
  });
});

// ─── getConversation ────────────────────────────────────────────────────────

describe("getConversation", () => {
  it("returns a single conversation with details", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(
      mockConversation as any,
    );
    vi.mocked(mockPrisma.message.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.message.count).mockResolvedValue(0);

    const result = await messageService.getConversation(conversationId, userId);

    expect(result.id).toBe(conversationId);
    expect(result.otherUser?.id).toBe(otherUserId);
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(null);

    await expect(
      messageService.getConversation(conversationId, "stranger"),
    ).rejects.toThrow("You are not a participant in this conversation.");
  });

  it("throws NOT_FOUND when conversation does not exist", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(null);

    await expect(
      messageService.getConversation("nonexistent", userId),
    ).rejects.toThrow("Conversation not found.");
  });
});

// ─── sendMessage ────────────────────────────────────────────────────────────

describe("sendMessage", () => {
  it("sends a message and updates lastMessageAt", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );

    const createdMessage = { ...mockMessage, content: "Hello!" };
    vi.mocked(mockPrisma.message.create).mockResolvedValue(createdMessage as any);
    vi.mocked(mockPrisma.conversation.update).mockResolvedValue({} as any);

    const result = await messageService.sendMessage(
      conversationId,
      { content: "Hello!" },
      userId,
    );

    expect(result.content).toBe("Hello!");
    expect(result.senderId).toBe(userId);
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: conversationId },
        data: { lastMessageAt: expect.any(Date) },
      }),
    );
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(null);

    await expect(
      messageService.sendMessage(conversationId, { content: "Hi" }, "stranger"),
    ).rejects.toThrow("You are not a participant in this conversation.");
  });

  it("validates replyToId exists in the same conversation", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.message.findUnique).mockResolvedValue(null);

    await expect(
      messageService.sendMessage(
        conversationId,
        { content: "Reply", replyToId: "msg-fake" },
        userId,
      ),
    ).rejects.toThrow("Reply target message not found in this conversation.");
  });

  it("throws when reply target is in a different conversation", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.message.findUnique).mockResolvedValue({
      id: "msg-fake",
      conversationId: "other-conv",
    } as any);

    await expect(
      messageService.sendMessage(
        conversationId,
        { content: "Reply", replyToId: "msg-fake" },
        userId,
      ),
    ).rejects.toThrow("Reply target message not found in this conversation.");
  });

  it("sends a message with file metadata", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.message.create).mockResolvedValue({
      ...mockMessage,
      type: "FILE",
      fileUrl: "https://files.test/doc.pdf",
      fileName: "doc.pdf",
      fileSize: 1024,
    } as any);
    vi.mocked(mockPrisma.conversation.update).mockResolvedValue({} as any);

    const result = await messageService.sendMessage(
      conversationId,
      {
        content: "Here's the file",
        type: "FILE",
        fileUrl: "https://files.test/doc.pdf",
        fileName: "doc.pdf",
        fileSize: 1024,
      },
      userId,
    );

    expect(result.type).toBe("FILE");
    expect(result.fileUrl).toBe("https://files.test/doc.pdf");
  });

  it("does not create message when user is not a participant", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(null);

    await expect(
      messageService.sendMessage(conversationId, { content: "Hi" }, "stranger"),
    ).rejects.toThrow();

    expect(mockPrisma.message.create).not.toHaveBeenCalled();
  });
});

// ─── getMessages ────────────────────────────────────────────────────────────

describe("getMessages", () => {
  it("returns paginated messages", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    (mockPrisma.$transaction as any).mockResolvedValue([[mockMessage], 1]);

    const result = await messageService.getMessages(conversationId, userId, {});

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 20, total: 1, totalPages: 1 }),
    );
    expect(result.data[0].content).toBe("Hello!");
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(null);

    await expect(
      messageService.getMessages(conversationId, "stranger", {}),
    ).rejects.toThrow("You are not a participant in this conversation.");
  });

  it("applies custom page and limit", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    (mockPrisma.$transaction as any).mockResolvedValue([[], 0]);

    const result = await messageService.getMessages(conversationId, userId, {
      page: 3,
      limit: 10,
    });

    expect(result.meta.page).toBe(3);
    expect(result.meta.limit).toBe(10);
  });

  it("excludes deleted messages", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    (mockPrisma.$transaction as any).mockResolvedValue([[], 0]);

    await messageService.getMessages(conversationId, userId, {});

    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isDeleted: false }),
      }),
    );
  });
});

// ─── markAsRead ─────────────────────────────────────────────────────────────

describe("markAsRead", () => {
  it("marks messages as read by updating lastReadAt", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.conversationParticipant.update).mockResolvedValue({} as any);

    const result = await messageService.markAsRead(conversationId, userId);

    expect(result.message).toBe("Messages marked as read.");
    expect(mockPrisma.conversationParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: expect.any(Date) },
      }),
    );
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(null);

    await expect(
      messageService.markAsRead(conversationId, "stranger"),
    ).rejects.toThrow("You are not a participant in this conversation.");
  });

  it("does not update when user is not a participant", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(null);

    await expect(
      messageService.markAsRead(conversationId, "stranger"),
    ).rejects.toThrow();

    expect(mockPrisma.conversationParticipant.update).not.toHaveBeenCalled();
  });
});

// ─── getUnreadCount ─────────────────────────────────────────────────────────

describe("getUnreadCount", () => {
  it("returns total unread count across all conversations", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findMany).mockResolvedValue([
      { conversationId: "conv-1", lastReadAt: null },
      { conversationId: "conv-2", lastReadAt: new Date("2025-01-01") },
    ] as any);
    vi.mocked(mockPrisma.message.count)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    const result = await messageService.getUnreadCount(userId);

    expect(result.unreadCount).toBe(4);
  });

  it("returns 0 when user has no conversations", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findMany).mockResolvedValue([]);

    const result = await messageService.getUnreadCount(userId);

    expect(result.unreadCount).toBe(0);
  });

  it("returns 0 when all conversations are fully read", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findMany).mockResolvedValue([
      { conversationId: "conv-1", lastReadAt: new Date("2099-01-01") },
    ] as any);
    vi.mocked(mockPrisma.message.count).mockResolvedValue(0);

    const result = await messageService.getUnreadCount(userId);

    expect(result.unreadCount).toBe(0);
  });

  it("excludes own messages from unread count", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findMany).mockResolvedValue([
      { conversationId: "conv-1", lastReadAt: null },
    ] as any);
    vi.mocked(mockPrisma.message.count).mockResolvedValue(2);

    await messageService.getUnreadCount(userId);

    expect(mockPrisma.message.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          senderId: { not: userId },
        }),
      }),
    );
  });

  it("excludes deleted messages from unread count", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findMany).mockResolvedValue([
      { conversationId: "conv-1", lastReadAt: null },
    ] as any);
    vi.mocked(mockPrisma.message.count).mockResolvedValue(0);

    await messageService.getUnreadCount(userId);

    expect(mockPrisma.message.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isDeleted: false }),
      }),
    );
  });
});

// ─── createGroup ────────────────────────────────────────────────────────────

describe("createGroup", () => {
  it("creates a group conversation with creator as admin", async () => {
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([
      { id: otherUserId },
      { id: "user-003" },
    ] as any);

    const groupConversation = {
      id: "group-1",
      type: "GROUP",
      name: "Study Group",
      description: null,
      groupImage: null,
      creatorId: userId,
      conversationParticipants: [
        { userId, isAdmin: true, user: mockUser1 },
        { userId: otherUserId, isAdmin: false, user: mockUser2 },
        { userId: "user-003", isAdmin: false, user: { id: "user-003", name: "Charlie", image: null } },
      ],
    };
    vi.mocked(mockPrisma.conversation.create).mockResolvedValue(groupConversation as any);

    const result = await messageService.createGroup(
      { name: "Study Group", participantIds: [otherUserId, "user-003"] },
      userId,
    );

    expect(result.type).toBe("GROUP");
    expect(result.name).toBe("Study Group");
    expect(result.creatorId).toBe(userId);
    expect(mockPrisma.conversation.create).toHaveBeenCalledOnce();
  });

  it("throws BAD_REQUEST when participant IDs are invalid", async () => {
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([
      { id: otherUserId },
    ] as any);

    await expect(
      messageService.createGroup(
        { name: "Group", participantIds: [otherUserId, "fake-user"] },
        userId,
      ),
    ).rejects.toThrow("One or more participants are invalid.");
  });

  it("validates all participant IDs exist", async () => {
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([]);

    await expect(
      messageService.createGroup(
        { name: "Group", participantIds: ["nonexistent"] },
        userId,
      ),
    ).rejects.toThrow("One or more participants are invalid.");
  });
});

// ─── updateGroup ────────────────────────────────────────────────────────────

describe("updateGroup", () => {
  it("updates group name as admin", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue({
      id: conversationId,
      type: "GROUP",
    } as any);
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue({
      ...mockParticipant,
      isAdmin: true,
    } as any);
    vi.mocked(mockPrisma.conversation.update).mockResolvedValue({
      id: conversationId,
      name: "New Name",
      conversationParticipants: [],
    } as any);

    const result = await messageService.updateGroup(
      conversationId,
      { name: "New Name" },
      userId,
    );

    expect(result.name).toBe("New Name");
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "New Name" }),
      }),
    );
  });

  it("throws NOT_FOUND when conversation does not exist", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(null);

    await expect(
      messageService.updateGroup("nonexistent", { name: "New" }, userId),
    ).rejects.toThrow("Conversation not found.");
  });

  it("throws BAD_REQUEST when conversation is not a group", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue({
      id: conversationId,
      type: "DIRECT",
    } as any);

    await expect(
      messageService.updateGroup(conversationId, { name: "New" }, userId),
    ).rejects.toThrow("This is not a group conversation.");
  });

  it("throws FORBIDDEN when user is not a group admin", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue({
      id: conversationId,
      type: "GROUP",
    } as any);
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue({
      ...mockParticipant,
      isAdmin: false,
    } as any);

    await expect(
      messageService.updateGroup(conversationId, { name: "New" }, userId),
    ).rejects.toThrow("Only group admins can update the group.");
  });

  it("throws FORBIDDEN when user is not a participant at all", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue({
      id: conversationId,
      type: "GROUP",
    } as any);
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(null);

    await expect(
      messageService.updateGroup(conversationId, { name: "New" }, "stranger"),
    ).rejects.toThrow("Only group admins can update the group.");
  });
});

// ─── leaveGroup ─────────────────────────────────────────────────────────────

describe("leaveGroup", () => {
  it("allows a non-creator member to leave", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue({
      id: conversationId,
      type: "GROUP",
      creatorId: otherUserId,
    } as any);
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.conversationParticipant.delete).mockResolvedValue({} as any);

    const result = await messageService.leaveGroup(conversationId, userId);

    expect(result.message).toBe("You have left the group.");
    expect(mockPrisma.conversationParticipant.delete).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId, userId } },
    });
  });

  it("throws NOT_FOUND when conversation does not exist", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue(null);

    await expect(
      messageService.leaveGroup("nonexistent", userId),
    ).rejects.toThrow("Conversation not found.");
  });

  it("throws BAD_REQUEST when conversation is not a group", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue({
      id: conversationId,
      type: "DIRECT",
    } as any);

    await expect(
      messageService.leaveGroup(conversationId, userId),
    ).rejects.toThrow("This is not a group conversation.");
  });

  it("throws BAD_REQUEST when creator tries to leave", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue({
      id: conversationId,
      type: "GROUP",
      creatorId: userId,
    } as any);

    await expect(
      messageService.leaveGroup(conversationId, userId),
    ).rejects.toThrow("The group creator cannot leave. Delete the group instead.");
  });

  it("throws NOT_FOUND when user is not a member", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue({
      id: conversationId,
      type: "GROUP",
      creatorId: otherUserId,
    } as any);
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(null);

    await expect(
      messageService.leaveGroup(conversationId, "stranger"),
    ).rejects.toThrow("You are not a member of this group.");
  });

  it("does not delete when creator attempts to leave", async () => {
    vi.mocked(mockPrisma.conversation.findUnique).mockResolvedValue({
      id: conversationId,
      type: "GROUP",
      creatorId: userId,
    } as any);

    await expect(
      messageService.leaveGroup(conversationId, userId),
    ).rejects.toThrow();

    expect(mockPrisma.conversationParticipant.delete).not.toHaveBeenCalled();
  });
});

// ─── markMessagesRead ───────────────────────────────────────────────────────

describe("markMessagesRead", () => {
  it("marks unread messages as read and returns updated IDs", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([
      { id: "msg-1" },
      { id: "msg-2" },
    ] as any);
    vi.mocked(mockPrisma.message.updateMany).mockResolvedValue({ count: 2 } as any);

    const result = await messageService.markMessagesRead(conversationId, userId);

    expect(result.messageIds).toEqual(["msg-1", "msg-2"]);
    expect(result.readAt).toBeInstanceOf(Date);
    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["msg-1", "msg-2"] } },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });

  it("returns empty messageIds when no unread messages", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([]);

    const result = await messageService.markMessagesRead(conversationId, userId);

    expect(result.messageIds).toEqual([]);
    expect(mockPrisma.message.updateMany).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(null);

    await expect(
      messageService.markMessagesRead(conversationId, "stranger"),
    ).rejects.toThrow("You are not a participant in this conversation.");
  });

  it("excludes own messages from the unread query", async () => {
    vi.mocked(mockPrisma.conversationParticipant.findUnique).mockResolvedValue(
      mockParticipant as any,
    );
    vi.mocked(mockPrisma.message.findMany).mockResolvedValue([]);
    vi.mocked(mockPrisma.message.updateMany).mockResolvedValue({ count: 0 } as any);

    await messageService.markMessagesRead(conversationId, userId);

    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          senderId: { not: userId },
          isRead: false,
          isDeleted: false,
        }),
      }),
    );
  });
});
