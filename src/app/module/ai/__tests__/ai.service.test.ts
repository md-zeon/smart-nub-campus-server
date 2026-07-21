import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    aiSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    aiMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    gamificationProfile: {
      findUnique: vi.fn(),
    },
    pointTransaction: {
      findMany: vi.fn(),
    },
  },
}));

import {
  createChatSession,
  sendChatMessage,
  getChatHistory,
  getUserSessions,
  deleteSession,
  getStudyStats,
} from "../ai.service";
import { prisma } from "../../../../app/lib/prisma";

const mockPrisma = vi.mocked(prisma);

describe("AIService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createChatSession", () => {
    it("should create a new chat session with default title", async () => {
      const mockSession = {
        id: "session-1",
        userId: "user-1",
        title: "New Chat",
        createdAt: new Date(),
      };
      mockPrisma.aiSession.create.mockResolvedValue(mockSession as never);

      const result = await createChatSession("user-1");

      expect(mockPrisma.aiSession.create).toHaveBeenCalledWith({
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
      mockPrisma.aiSession.create.mockResolvedValue(mockSession as never);

      const result = await createChatSession("user-1", "Physics Notes");

      expect(mockPrisma.aiSession.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          title: "Physics Notes",
        },
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe("sendChatMessage", () => {
    it("should send a message and return AI response", async () => {
      const mockSession = {
        id: "session-1",
        userId: "user-1",
        title: "Chat",
      };
      const mockUserMessage = {
        id: "msg-1",
        sessionId: "session-1",
        role: "user",
        content: "What is Newton's first law?",
      };
      const mockAiMessage = {
        id: "msg-2",
        sessionId: "session-1",
        role: "assistant",
        content: "Newton's first law states that an object at rest stays at rest...",
      };

      mockPrisma.aiSession.findUnique.mockResolvedValue(mockSession as never);
      mockPrisma.aiMessage.create
        .mockResolvedValueOnce(mockUserMessage as never)
        .mockResolvedValueOnce(mockAiMessage as never);

      const result = await sendChatMessage(
        "session-1",
        "user-1",
        "What is Newton's first law?"
      );

      expect(mockPrisma.aiSession.findUnique).toHaveBeenCalledWith({
        where: { id: "session-1" },
      });
      expect(mockPrisma.aiMessage.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        userMessage: mockUserMessage,
        aiMessage: mockAiMessage,
      });
    });

    it("should throw if session does not exist", async () => {
      mockPrisma.aiSession.findUnique.mockResolvedValue(null);

      await expect(
        sendChatMessage("invalid-session", "user-1", "Hello")
      ).rejects.toThrow("Session not found");
    });

    it("should throw if user does not own the session", async () => {
      const mockSession = {
        id: "session-1",
        userId: "other-user",
      };
      mockPrisma.aiSession.findUnique.mockResolvedValue(mockSession as never);

      await expect(
        sendChatMessage("session-1", "user-1", "Hello")
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("getChatHistory", () => {
    it("should return messages for a valid session", async () => {
      const mockSession = {
        id: "session-1",
        userId: "user-1",
      };
      const mockMessages = [
        { id: "msg-1", role: "user", content: "Hi" },
        { id: "msg-2", role: "assistant", content: "Hello!" },
      ];

      mockPrisma.aiSession.findUnique.mockResolvedValue(mockSession as never);
      mockPrisma.aiMessage.findMany.mockResolvedValue(mockMessages as never);

      const result = await getChatHistory("session-1", "user-1");

      expect(mockPrisma.aiMessage.findMany).toHaveBeenCalledWith({
        where: { sessionId: "session-1" },
        orderBy: { createdAt: "asc" },
      });
      expect(result).toEqual(mockMessages);
    });

    it("should throw if session does not exist", async () => {
      mockPrisma.aiSession.findUnique.mockResolvedValue(null);

      await expect(
        getChatHistory("invalid-session", "user-1")
      ).rejects.toThrow("Session not found");
    });

    it("should throw if user does not own the session", async () => {
      mockPrisma.aiSession.findUnique.mockResolvedValue({
        id: "session-1",
        userId: "other-user",
      } as never);

      await expect(
        getChatHistory("session-1", "user-1")
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("getUserSessions", () => {
    it("should return all sessions for a user", async () => {
      const mockSessions = [
        { id: "s1", title: "Chat 1" },
        { id: "s2", title: "Chat 2" },
      ];
      mockPrisma.aiSession.findMany.mockResolvedValue(mockSessions as never);

      const result = await getUserSessions("user-1");

      expect(mockPrisma.aiSession.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockSessions);
    });

    it("should return empty array if user has no sessions", async () => {
      mockPrisma.aiSession.findMany.mockResolvedValue([]);

      const result = await getUserSessions("user-1");

      expect(result).toEqual([]);
    });
  });

  describe("deleteSession", () => {
    it("should delete a session successfully", async () => {
      const mockSession = {
        id: "session-1",
        userId: "user-1",
      };
      mockPrisma.aiSession.findUnique.mockResolvedValue(mockSession as never);
      mockPrisma.aiSession.delete.mockResolvedValue(mockSession as never);

      await deleteSession("session-1", "user-1");

      expect(mockPrisma.aiSession.delete).toHaveBeenCalledWith({
        where: { id: "session-1" },
      });
    });

    it("should throw if session does not exist", async () => {
      mockPrisma.aiSession.findUnique.mockResolvedValue(null);

      await expect(
        deleteSession("invalid-session", "user-1")
      ).rejects.toThrow("Session not found");
    });

    it("should throw if user does not own the session", async () => {
      mockPrisma.aiSession.findUnique.mockResolvedValue({
        id: "session-1",
        userId: "other-user",
      } as never);

      await expect(
        deleteSession("session-1", "user-1")
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("getStudyStats", () => {
    it("should return study stats for a user with a profile", async () => {
      const mockProfile = {
        userId: "user-1",
        totalPoints: 500,
        level: 5,
        streak: 7,
      };
      const mockTransactions = [
        { id: "t1", points: 100, createdAt: new Date("2026-07-01") },
        { id: "t2", points: 200, createdAt: new Date("2026-07-15") },
      ];

      mockPrisma.gamificationProfile.findUnique.mockResolvedValue(
        mockProfile as never
      );
      mockPrisma.pointTransaction.findMany.mockResolvedValue(
        mockTransactions as never
      );

      const result = await getStudyStats("user-1");

      expect(mockPrisma.gamificationProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(mockPrisma.pointTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toHaveProperty("totalPoints", 500);
      expect(result).toHaveProperty("level", 5);
      expect(result).toHaveProperty("streak", 7);
      expect(result).toHaveProperty("recentActivity");
    });

    it("should return default stats if no profile exists", async () => {
      mockPrisma.gamificationProfile.findUnique.mockResolvedValue(null);
      mockPrisma.pointTransaction.findMany.mockResolvedValue([]);

      const result = await getStudyStats("user-1");

      expect(result).toHaveProperty("totalPoints", 0);
      expect(result).toHaveProperty("level", 1);
      expect(result).toHaveProperty("streak", 0);
      expect(result).toHaveProperty("recentActivity", []);
    });
  });
});
