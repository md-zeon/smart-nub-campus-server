import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    aIChatSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    aIMessage: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    aIStudyStats: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import aiService from "../ai.service";
import { prisma } from "../../../../app/lib/prisma";

const mockPrisma = vi.mocked(prisma);

describe("AIService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSession", () => {
    it("should create a new chat session with default title", async () => {
      const mockSession = {
        id: "session-1",
        userId: "user-1",
        title: "New Chat",
        createdAt: new Date(),
      };
      mockPrisma.aIChatSession.create.mockResolvedValue(mockSession as never);

      const result = await aiService.createSession("user-1");

      expect(mockPrisma.aIChatSession.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          title: "New Chat",
        },
      });
      expect(result).toEqual(mockSession);
    });

    it("should create a chat session with custom title", async () => {
      const mockSession = {
        id: "session-1",
        userId: "user-1",
        title: "Physics Notes",
        createdAt: new Date(),
      };
      mockPrisma.aIChatSession.create.mockResolvedValue(mockSession as never);

      const result = await aiService.createSession("user-1", "Physics Notes");

      expect(mockPrisma.aIChatSession.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          title: "Physics Notes",
        },
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe("getSessions", () => {
    it("should return sessions with pagination", async () => {
      const mockSessions = [
        { id: "s1", title: "Chat 1", aiMessages: [{ content: "Hi", role: "USER" }] },
        { id: "s2", title: "Chat 2", aiMessages: [] },
      ];
      mockPrisma.aIChatSession.findMany.mockResolvedValue(mockSessions as never);
      mockPrisma.aIChatSession.count.mockResolvedValue(2);

      const result = await aiService.getSessions("user-1", 1, 20);

      expect(mockPrisma.aIChatSession.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        include: {
          aiMessages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { content: true, role: true },
          },
        },
        skip: 0,
        take: 20,
      });
      expect(result.sessions).toEqual(mockSessions);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it("should return empty sessions for user with no sessions", async () => {
      mockPrisma.aIChatSession.findMany.mockResolvedValue([]);
      mockPrisma.aIChatSession.count.mockResolvedValue(0);

      const result = await aiService.getSessions("user-1");

      expect(result.sessions).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("getSessionById", () => {
    it("should return session with messages", async () => {
      const mockSession = {
        id: "session-1",
        userId: "user-1",
        aiMessages: [{ id: "msg-1", content: "Hi", role: "USER" }],
      };
      mockPrisma.aIChatSession.findUnique.mockResolvedValue(mockSession as never);

      const result = await aiService.getSessionById("session-1", "user-1");

      expect(result).toEqual(mockSession);
    });

    it("should throw if session does not exist", async () => {
      mockPrisma.aIChatSession.findUnique.mockResolvedValue(null);

      await expect(
        aiService.getSessionById("invalid-session", "user-1")
      ).rejects.toThrow("Chat session not found");
    });

    it("should throw if user does not own the session", async () => {
      mockPrisma.aIChatSession.findUnique.mockResolvedValue({
        id: "session-1",
        userId: "other-user",
      } as never);

      await expect(
        aiService.getSessionById("session-1", "user-1")
      ).rejects.toThrow("You do not have access to this session");
    });
  });

  describe("deleteSession", () => {
    it("should delete a session successfully", async () => {
      const mockSession = { id: "session-1", userId: "user-1" };
      mockPrisma.aIChatSession.findUnique.mockResolvedValue(mockSession as never);
      mockPrisma.aIChatSession.delete.mockResolvedValue(mockSession as never);

      await aiService.deleteSession("session-1", "user-1");

      expect(mockPrisma.aIChatSession.delete).toHaveBeenCalledWith({
        where: { id: "session-1" },
      });
    });

    it("should throw if session does not exist", async () => {
      mockPrisma.aIChatSession.findUnique.mockResolvedValue(null);

      await expect(
        aiService.deleteSession("invalid-session", "user-1")
      ).rejects.toThrow("Chat session not found");
    });

    it("should throw if user does not own the session", async () => {
      mockPrisma.aIChatSession.findUnique.mockResolvedValue({
        id: "session-1",
        userId: "other-user",
      } as never);

      await expect(
        aiService.deleteSession("session-1", "user-1")
      ).rejects.toThrow("You do not have access to this session");
    });
  });

  describe("sendMessage", () => {
    it("should send a message and return user and AI messages", async () => {
      const mockSession = { id: "session-1", userId: "user-1", title: "Chat" };
      const mockUserMessage = {
        id: "msg-1",
        sessionId: "session-1",
        role: "USER",
        content: "What is Newton's first law?",
      };
      const mockAiMessage = {
        id: "msg-2",
        sessionId: "session-1",
        role: "ASSISTANT",
        content: "Newton's first law states...",
      };

      mockPrisma.aIChatSession.findUnique.mockResolvedValue(mockSession as never);
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          aIMessage: {
            create: vi.fn()
              .mockResolvedValueOnce(mockUserMessage)
              .mockResolvedValueOnce(mockAiMessage),
          },
          aIStudyStats: {
            upsert: vi.fn().mockResolvedValue({}),
          },
          aIChatSession: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const result = await aiService.sendMessage(
        "session-1",
        "What is Newton's first law?",
        "user-1"
      );

      expect(mockPrisma.aIChatSession.findUnique).toHaveBeenCalledWith({
        where: { id: "session-1" },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.userMessage).toEqual(mockUserMessage);
      expect(result.aiMessage).toEqual(mockAiMessage);
    });

    it("should throw if session does not exist", async () => {
      mockPrisma.aIChatSession.findUnique.mockResolvedValue(null);

      await expect(
        aiService.sendMessage("invalid-session", "Hello", "user-1")
      ).rejects.toThrow("Chat session not found");
    });

    it("should throw if user does not own the session", async () => {
      mockPrisma.aIChatSession.findUnique.mockResolvedValue({
        id: "session-1",
        userId: "other-user",
      } as never);

      await expect(
        aiService.sendMessage("session-1", "Hello", "user-1")
      ).rejects.toThrow("You do not have access to this session");
    });
  });

  describe("getMessages", () => {
    it("should return messages for a valid session", async () => {
      const mockSession = { id: "session-1", userId: "user-1" };
      const mockMessages = [
        { id: "msg-1", role: "USER", content: "Hi" },
        { id: "msg-2", role: "ASSISTANT", content: "Hello!" },
      ];

      mockPrisma.aIChatSession.findUnique.mockResolvedValue(mockSession as never);
      mockPrisma.aIMessage.findMany.mockResolvedValue(mockMessages as never);
      mockPrisma.aIMessage.count.mockResolvedValue(2);

      const result = await aiService.getMessages("session-1", "user-1");

      expect(mockPrisma.aIMessage.findMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1" },
        orderBy: { createdAt: "asc" },
        skip: 0,
        take: 50,
      });
      expect(result.data).toEqual(mockMessages);
      expect(result.meta.total).toBe(2);
    });

    it("should throw if session does not exist", async () => {
      mockPrisma.aIChatSession.findUnique.mockResolvedValue(null);

      await expect(
        aiService.getMessages("invalid-session", "user-1")
      ).rejects.toThrow("Chat session not found");
    });

    it("should throw if user does not own the session", async () => {
      mockPrisma.aIChatSession.findUnique.mockResolvedValue({
        id: "session-1",
        userId: "other-user",
      } as never);

      await expect(
        aiService.getMessages("session-1", "user-1")
      ).rejects.toThrow("You do not have access to this session");
    });
  });

  describe("markHelpful", () => {
    it("should mark a message as helpful", async () => {
      const mockMessage = {
        id: "msg-1",
        session: { userId: "user-1" },
      };
      const mockUpdated = { id: "msg-1", isHelpful: true };

      mockPrisma.aIMessage.findUnique.mockResolvedValue(mockMessage as never);
      mockPrisma.aIMessage.update.mockResolvedValue(mockUpdated as never);

      const result = await aiService.markHelpful("msg-1", true, "user-1");

      expect(mockPrisma.aIMessage.update).toHaveBeenCalledWith({
        where: { id: "msg-1" },
        data: { isHelpful: true },
      });
      expect(result).toEqual(mockUpdated);
    });

    it("should throw if message does not exist", async () => {
      mockPrisma.aIMessage.findUnique.mockResolvedValue(null);

      await expect(
        aiService.markHelpful("invalid-msg", true, "user-1")
      ).rejects.toThrow("Message not found");
    });

    it("should throw if user does not own the message", async () => {
      mockPrisma.aIMessage.findUnique.mockResolvedValue({
        id: "msg-1",
        session: { userId: "other-user" },
      } as never);

      await expect(
        aiService.markHelpful("msg-1", true, "user-1")
      ).rejects.toThrow("You do not have access to this message");
    });
  });

  describe("getStudyStats", () => {
    it("should return study stats for a user", async () => {
      const mockStats = {
        id: "stat-1",
        userId: "user-1",
        weekStart: new Date(),
        questionsAsked: 10,
        timeSpentMinutes: 30,
        topicsExplored: 5,
        quizzesGenerated: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.aIStudyStats.findUnique.mockResolvedValue(mockStats as never);

      const result = await aiService.getStudyStats("user-1");

      expect(mockPrisma.aIStudyStats.findUnique).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it("should return default stats if no stats exist", async () => {
      mockPrisma.aIStudyStats.findUnique.mockResolvedValue(null);

      const result = await aiService.getStudyStats("user-1");

      expect(result).toHaveProperty("userId", "user-1");
      expect(result).toHaveProperty("questionsAsked", 0);
      expect(result).toHaveProperty("timeSpentMinutes", 0);
      expect(result).toHaveProperty("topicsExplored", 0);
      expect(result).toHaveProperty("quizzesGenerated", 0);
      expect(result).toHaveProperty("id", null);
    });
  });

  describe("getStudyStatsHistory", () => {
    it("should return stats history", async () => {
      const mockStats = [
        { id: "s1", userId: "user-1", questionsAsked: 10 },
        { id: "s2", userId: "user-1", questionsAsked: 5 },
      ];

      mockPrisma.aIStudyStats.findMany.mockResolvedValue(mockStats as never);

      const result = await aiService.getStudyStatsHistory("user-1");

      expect(mockPrisma.aIStudyStats.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { weekStart: "desc" },
        take: 4,
      });
      expect(result).toEqual(mockStats);
    });
  });
});
