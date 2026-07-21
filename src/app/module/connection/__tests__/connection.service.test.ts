import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    connection: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    blockedUser: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    connectionFavorite: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
    },
    userSkill: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    tag: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (fns: any) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      return fns((...args: any[]) => args[args.length - 1]);
    }),
  },
}));

import { connectionService } from "../connection.service";
import { prisma } from "../../../../app/lib/prisma";

const mockedPrisma = vi.mocked(prisma);

const userId = "user-001";
const receiverId = "user-002";
const connectionId = "conn-001";

afterEach(() => {
  vi.clearAllMocks();
});

// ─── sendConnectionRequest ──────────────────────────────────────────────────

describe("sendConnectionRequest", () => {
  it("sends a connection request successfully", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({ id: receiverId });
    (mockedPrisma.blockedUser.findFirst as any).mockResolvedValue(null);
    (mockedPrisma.connection.findFirst as any).mockResolvedValue(null);
    (mockedPrisma.connection.create as any).mockResolvedValue({
      id: connectionId,
      requesterId: userId,
      receiverId,
      status: "PENDING",
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await connectionService.sendConnectionRequest(
      { receiverId },
      userId,
    );

    expect(result.status).toBe("PENDING");
    expect(mockedPrisma.connection.create).toHaveBeenCalledOnce();
  });

  it("throws BAD_REQUEST when sending to self", async () => {
    await expect(
      connectionService.sendConnectionRequest({ receiverId: userId }, userId),
    ).rejects.toThrow("You cannot send a connection request to yourself.");
  });

  it("throws NOT_FOUND when receiver does not exist", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue(null);

    await expect(
      connectionService.sendConnectionRequest({ receiverId }, userId),
    ).rejects.toThrow("User not found.");
  });

  it("throws FORBIDDEN when users are blocked", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({ id: receiverId });
    (mockedPrisma.blockedUser.findFirst as any).mockResolvedValue({
      id: "block-1",
      blockerId: userId,
      blockedId: receiverId,
    });

    await expect(
      connectionService.sendConnectionRequest({ receiverId }, userId),
    ).rejects.toThrow("You cannot send a connection request to this user.");
  });

  it("throws CONFLICT when a pending request already exists", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({ id: receiverId });
    (mockedPrisma.blockedUser.findFirst as any).mockResolvedValue(null);
    (mockedPrisma.connection.findFirst as any).mockResolvedValue({
      id: "existing-1",
      requesterId: userId,
      receiverId,
      status: "PENDING",
    });

    await expect(
      connectionService.sendConnectionRequest({ receiverId }, userId),
    ).rejects.toThrow("A pending connection request already exists.");
  });

  it("throws CONFLICT when already connected", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({ id: receiverId });
    (mockedPrisma.blockedUser.findFirst as any).mockResolvedValue(null);
    (mockedPrisma.connection.findFirst as any).mockResolvedValue({
      id: "existing-1",
      requesterId: userId,
      receiverId,
      status: "ACCEPTED",
    });

    await expect(
      connectionService.sendConnectionRequest({ receiverId }, userId),
    ).rejects.toThrow("You are already connected with this user.");
  });

  it("re-requests when previous connection was rejected", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({ id: receiverId });
    (mockedPrisma.blockedUser.findFirst as any).mockResolvedValue(null);
    (mockedPrisma.connection.findFirst as any).mockResolvedValue({
      id: "old-conn",
      requesterId: receiverId,
      receiverId: userId,
      status: "REJECTED",
    });
    (mockedPrisma.connection.update as any).mockResolvedValue({
      id: "old-conn",
      requesterId: userId,
      receiverId,
      status: "PENDING",
    });

    const result = await connectionService.sendConnectionRequest(
      { receiverId },
      userId,
    );

    expect(result.status).toBe("PENDING");
    expect(mockedPrisma.connection.update).toHaveBeenCalledOnce();
    expect(mockedPrisma.connection.create).not.toHaveBeenCalled();
  });

  it("includes note when provided", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({ id: receiverId });
    (mockedPrisma.blockedUser.findFirst as any).mockResolvedValue(null);
    (mockedPrisma.connection.findFirst as any).mockResolvedValue(null);
    (mockedPrisma.connection.create as any).mockResolvedValue({
      id: connectionId,
      requesterId: userId,
      receiverId,
      status: "PENDING",
      note: "Let's connect!",
    });

    await connectionService.sendConnectionRequest(
      { receiverId, note: "Let's connect!" },
      userId,
    );

    expect(mockedPrisma.connection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ note: "Let's connect!" }),
      }),
    );
  });
});

// ─── acceptConnection ───────────────────────────────────────────────────────

describe("acceptConnection", () => {
  it("accepts a pending connection request", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: receiverId,
      receiverId: userId,
      status: "PENDING",
    });
    (mockedPrisma.connection.update as any).mockResolvedValue({
      id: connectionId,
      status: "ACCEPTED",
    });

    const result = await connectionService.acceptConnection(
      connectionId,
      userId,
    );

    expect(result.status).toBe("ACCEPTED");
  });

  it("throws NOT_FOUND when connection does not exist", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue(null);

    await expect(
      connectionService.acceptConnection("nonexistent", userId),
    ).rejects.toThrow("Connection request not found.");
  });

  it("throws FORBIDDEN when user is not the receiver", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: "someone-else",
      receiverId: "another-user",
      status: "PENDING",
    });

    await expect(
      connectionService.acceptConnection(connectionId, userId),
    ).rejects.toThrow("Only the receiver can accept a connection request.");
  });

  it("throws BAD_REQUEST when connection is not pending", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: receiverId,
      receiverId: userId,
      status: "ACCEPTED",
    });

    await expect(
      connectionService.acceptConnection(connectionId, userId),
    ).rejects.toThrow("This connection request is no longer pending.");
  });
});

// ─── rejectConnection ───────────────────────────────────────────────────────

describe("rejectConnection", () => {
  it("rejects a pending connection request", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: receiverId,
      receiverId: userId,
      status: "PENDING",
    });
    (mockedPrisma.connection.update as any).mockResolvedValue({
      id: connectionId,
      status: "REJECTED",
    });

    const result = await connectionService.rejectConnection(
      connectionId,
      userId,
    );

    expect(result.status).toBe("REJECTED");
  });

  it("throws NOT_FOUND when connection does not exist", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue(null);

    await expect(
      connectionService.rejectConnection("nonexistent", userId),
    ).rejects.toThrow("Connection request not found.");
  });

  it("throws FORBIDDEN when user is not the receiver", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: "someone-else",
      receiverId: "another-user",
      status: "PENDING",
    });

    await expect(
      connectionService.rejectConnection(connectionId, userId),
    ).rejects.toThrow("Only the receiver can reject a connection request.");
  });

  it("throws BAD_REQUEST when connection is not pending", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: receiverId,
      receiverId: userId,
      status: "REJECTED",
    });

    await expect(
      connectionService.rejectConnection(connectionId, userId),
    ).rejects.toThrow("This connection request is no longer pending.");
  });
});

// ─── removeConnection ───────────────────────────────────────────────────────

describe("removeConnection", () => {
  it("removes an accepted connection as requester", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: userId,
      receiverId,
      status: "ACCEPTED",
    });
    (mockedPrisma.connection.delete as any).mockResolvedValue({});

    const result = await connectionService.removeConnection(
      connectionId,
      userId,
    );

    expect(result.message).toBe("Connection removed successfully.");
    expect(mockedPrisma.connection.delete).toHaveBeenCalledWith({
      where: { id: connectionId },
    });
  });

  it("removes an accepted connection as receiver", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: receiverId,
      receiverId: userId,
      status: "ACCEPTED",
    });
    (mockedPrisma.connection.delete as any).mockResolvedValue({});

    const result = await connectionService.removeConnection(
      connectionId,
      userId,
    );

    expect(result.message).toBe("Connection removed successfully.");
  });

  it("throws NOT_FOUND when connection does not exist", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue(null);

    await expect(
      connectionService.removeConnection("nonexistent", userId),
    ).rejects.toThrow("Connection not found.");
  });

  it("throws FORBIDDEN when user is not part of the connection", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: "user-a",
      receiverId: "user-b",
      status: "ACCEPTED",
    });

    await expect(
      connectionService.removeConnection(connectionId, userId),
    ).rejects.toThrow("You are not part of this connection.");
  });

  it("throws BAD_REQUEST when connection is not accepted", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: userId,
      receiverId,
      status: "PENDING",
    });

    await expect(
      connectionService.removeConnection(connectionId, userId),
    ).rejects.toThrow("Only accepted connections can be removed.");
  });
});

// ─── blockUser ──────────────────────────────────────────────────────────────

describe("blockUser", () => {
  it("blocks a user successfully", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({ id: receiverId });
    (mockedPrisma.blockedUser.findUnique as any).mockResolvedValue(null);
    (mockedPrisma.$transaction as any).mockImplementation(async (fn: any) => {
      const tx = {
        blockedUser: { create: vi.fn().mockResolvedValue({}) },
        connection: { deleteMany: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await connectionService.blockUser(
      { blockedId: receiverId },
      userId,
    );

    expect(result.message).toBe("User blocked successfully.");
  });

  it("throws BAD_REQUEST when blocking self", async () => {
    await expect(
      connectionService.blockUser({ blockedId: userId }, userId),
    ).rejects.toThrow("You cannot block yourself.");
  });

  it("throws NOT_FOUND when blocked user does not exist", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue(null);

    await expect(
      connectionService.blockUser({ blockedId: receiverId }, userId),
    ).rejects.toThrow("User not found.");
  });

  it("throws CONFLICT when user is already blocked", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({ id: receiverId });
    (mockedPrisma.blockedUser.findUnique as any).mockResolvedValue({
      id: "block-1",
      blockerId: userId,
      blockedId: receiverId,
    });

    await expect(
      connectionService.blockUser({ blockedId: receiverId }, userId),
    ).rejects.toThrow("User is already blocked.");
  });

  it("deletes pending connections between users during block", async () => {
    const deleteManyMock = vi.fn().mockResolvedValue({});
    const createMock = vi.fn().mockResolvedValue({});

    (mockedPrisma.user.findUnique as any).mockResolvedValue({ id: receiverId });
    (mockedPrisma.blockedUser.findUnique as any).mockResolvedValue(null);
    (mockedPrisma.$transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        blockedUser: { create: createMock },
        connection: { deleteMany: deleteManyMock },
      });
    });

    await connectionService.blockUser({ blockedId: receiverId }, userId);

    expect(createMock).toHaveBeenCalledWith({
      data: { blockerId: userId, blockedId: receiverId },
    });
    expect(deleteManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      }),
    );
  });
});

// ─── unblockUser ────────────────────────────────────────────────────────────

describe("unblockUser", () => {
  it("unblocks a user successfully", async () => {
    (mockedPrisma.blockedUser.findUnique as any).mockResolvedValue({
      id: "block-1",
      blockerId: userId,
      blockedId: receiverId,
    });
    (mockedPrisma.blockedUser.delete as any).mockResolvedValue({});

    const result = await connectionService.unblockUser(receiverId, userId);

    expect(result.message).toBe("User unblocked successfully.");
  });

  it("throws NOT_FOUND when block record does not exist", async () => {
    (mockedPrisma.blockedUser.findUnique as any).mockResolvedValue(null);

    await expect(
      connectionService.unblockUser(receiverId, userId),
    ).rejects.toThrow("Block not found.");
  });
});

// ─── getMyConnections ───────────────────────────────────────────────────────

describe("getMyConnections", () => {
  it("returns paginated connections with default params", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      student: { admissionYear: 2022, admissionSemester: "FALL" },
      profile: { currentSemester: 6 },
    });
    (mockedPrisma.connection.findMany as any).mockResolvedValue([
      {
        id: connectionId,
        requesterId: receiverId,
        receiverId: userId,
        status: "ACCEPTED",
        isFavorite: false,
        note: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
        requester: {
          id: receiverId,
          name: "Bob",
          email: "bob@test.com",
          image: null,
          student: null,
          profile: null,
        },
        receiver: {
          id: userId,
          name: "Alice",
          email: "alice@test.com",
          image: null,
          student: null,
          profile: null,
        },
      },
    ]);
    (mockedPrisma.connection.count as any).mockResolvedValue(1);

    const result = await connectionService.getMyConnections(userId, {});

    expect(result.data).toHaveLength(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.total).toBe(1);
    expect(result.data[0].id).toBe(connectionId);
    expect(result.data[0].requesterId).toBe(receiverId);
    expect(result.data[0].receiverId).toBe(userId);
    expect(result.data[0].status).toBe("ACCEPTED");
  });

  it("applies FAVORITES filter", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      student: null,
      profile: { currentSemester: 4 },
    });
    (mockedPrisma.connection.findMany as any).mockResolvedValue([]);
    (mockedPrisma.connection.count as any).mockResolvedValue(0);

    await connectionService.getMyConnections(userId, { filter: "FAVORITES" });

    expect(mockedPrisma.connection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isFavorite: true }),
      }),
    );
  });

  it("excludes blocked users from results", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([
      { blockerId: userId, blockedId: receiverId },
    ]);
    (mockedPrisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      student: null,
      profile: null,
    });
    (mockedPrisma.connection.findMany as any).mockResolvedValue([
      {
        id: connectionId,
        requesterId: userId,
        receiverId,
        status: "ACCEPTED",
        isFavorite: false,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        requester: { id: userId },
        receiver: { id: receiverId },
      },
    ]);
    (mockedPrisma.connection.count as any).mockResolvedValue(1);

    const result = await connectionService.getMyConnections(userId, {});

    expect(result.data).toHaveLength(0);
  });

  it("applies custom page and limit", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      student: null,
      profile: null,
    });
    (mockedPrisma.connection.findMany as any).mockResolvedValue([]);
    (mockedPrisma.connection.count as any).mockResolvedValue(0);

    await connectionService.getMyConnections(userId, { page: 2, limit: 5 });

    expect(mockedPrisma.connection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(mockedPrisma.connection.count).toHaveBeenCalled();
  });
});

// ─── getPendingRequests ─────────────────────────────────────────────────────

describe("getPendingRequests", () => {
  it("returns pending incoming requests", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([
      {
        id: connectionId,
        requesterId: receiverId,
        receiverId: userId,
        status: "PENDING",
        isFavorite: false,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        requester: {
          id: receiverId,
          name: "Bob",
          email: "bob@test.com",
          image: null,
          student: null,
          profile: null,
        },
      },
    ]);

    const result = await connectionService.getPendingRequests(userId);

    expect(result).toHaveLength(1);
    expect(result[0].requesterId).toBe(receiverId);
    expect(result[0].otherUser.name).toBe("Bob");
  });

  it("returns empty array when no pending requests", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([]);

    const result = await connectionService.getPendingRequests(userId);

    expect(result).toHaveLength(0);
  });
});

// ─── getSentRequests ────────────────────────────────────────────────────────

describe("getSentRequests", () => {
  it("returns outgoing pending requests", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([
      {
        id: connectionId,
        requesterId: userId,
        receiverId,
        status: "PENDING",
        isFavorite: false,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        receiver: {
          id: receiverId,
          name: "Bob",
          email: "bob@test.com",
          image: null,
          student: null,
          profile: null,
        },
      },
    ]);

    const result = await connectionService.getSentRequests(userId);

    expect(result).toHaveLength(1);
    expect(result[0].otherUser.name).toBe("Bob");
  });

  it("returns empty array when no sent requests", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([]);

    const result = await connectionService.getSentRequests(userId);

    expect(result).toHaveLength(0);
  });
});

// ─── toggleFavorite ─────────────────────────────────────────────────────────

describe("toggleFavorite", () => {
  it("toggles favorite on an accepted connection", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: userId,
      receiverId,
      status: "ACCEPTED",
      isFavorite: false,
    });
    (mockedPrisma.connection.update as any).mockResolvedValue({
      id: connectionId,
      isFavorite: true,
    });

    const result = await connectionService.toggleFavorite(
      connectionId,
      userId,
    );

    expect(result.isFavorite).toBe(true);
    expect(mockedPrisma.connection.update).toHaveBeenCalledWith({
      where: { id: connectionId },
      data: { isFavorite: true },
    });
  });

  it("toggles favorite off when already favorited", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: userId,
      receiverId,
      status: "ACCEPTED",
      isFavorite: true,
    });
    (mockedPrisma.connection.update as any).mockResolvedValue({
      id: connectionId,
      isFavorite: false,
    });

    const result = await connectionService.toggleFavorite(
      connectionId,
      userId,
    );

    expect(result.isFavorite).toBe(false);
  });

  it("throws NOT_FOUND when connection does not exist", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue(null);

    await expect(
      connectionService.toggleFavorite("nonexistent", userId),
    ).rejects.toThrow("Connection not found.");
  });

  it("throws FORBIDDEN when user is not part of the connection", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: "user-a",
      receiverId: "user-b",
      status: "ACCEPTED",
      isFavorite: false,
    });

    await expect(
      connectionService.toggleFavorite(connectionId, userId),
    ).rejects.toThrow("You are not part of this connection.");
  });

  it("throws BAD_REQUEST when connection is not accepted", async () => {
    (mockedPrisma.connection.findUnique as any).mockResolvedValue({
      id: connectionId,
      requesterId: userId,
      receiverId,
      status: "PENDING",
      isFavorite: false,
    });

    await expect(
      connectionService.toggleFavorite(connectionId, userId),
    ).rejects.toThrow("Only accepted connections can be favorited.");
  });
});

// ─── getSuggestedPeople ─────────────────────────────────────────────────────

describe("getSuggestedPeople", () => {
  it("returns suggested people based on friends of friends", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      student: { department: "CSE" },
      profile: { currentSemester: 4 },
    });
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.connection.findMany as any)
      .mockResolvedValueOnce([
        { requesterId: userId, receiverId: "friend-1" },
      ])
      .mockResolvedValueOnce([
        { requesterId: "friend-1", receiverId: "suggested-1" },
      ]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([
      {
        id: "suggested-1",
        name: "Charlie",
        email: "charlie@test.com",
        image: null,
        student: { department: "CSE", admissionYear: 2022, admissionSemester: "FALL" },
        profile: { currentSemester: 4 },
      },
    ]);

    const result = await connectionService.getSuggestedPeople(userId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("suggested-1");
    expect(result[0].mutualConnections).toBe(1);
    expect(result[0].score).toBeGreaterThanOrEqual(1);
  });

  it("returns empty array when no connections exist", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      student: null,
      profile: null,
    });
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.connection.findMany as any).mockResolvedValueOnce([]);

    const result = await connectionService.getSuggestedPeople(userId);

    expect(result).toHaveLength(0);
  });

  it("excludes already connected users", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      student: null,
      profile: null,
    });
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.connection.findMany as any)
      .mockResolvedValueOnce([
        { requesterId: userId, receiverId: "friend-1" },
      ])
      .mockResolvedValueOnce([
        { requesterId: "friend-1", receiverId: userId },
      ]);

    const result = await connectionService.getSuggestedPeople(userId);

    expect(result).toHaveLength(0);
  });

  it("excludes blocked users from suggestions", async () => {
    (mockedPrisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      student: null,
      profile: null,
    });
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([
      { blockerId: userId, blockedId: "suggested-1" },
    ]);
    (mockedPrisma.connection.findMany as any)
      .mockResolvedValueOnce([
        { requesterId: userId, receiverId: "friend-1" },
      ])
      .mockResolvedValueOnce([
        { requesterId: "friend-1", receiverId: "suggested-1" },
      ]);

    const result = await connectionService.getSuggestedPeople(userId);

    expect(result).toHaveLength(0);
  });
});

// ─── searchPeople ───────────────────────────────────────────────────────────

describe("searchPeople", () => {
  it("searches people by name", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([
      {
        id: receiverId,
        name: "Bob",
        email: "bob@test.com",
        image: null,
        student: { department: "CSE", admissionYear: 2022, admissionSemester: "FALL" },
        profile: { currentSemester: 4, batchYear: 2022, bio: null },
        userSkills: [],
      },
    ]);
    (mockedPrisma.user.count as any).mockResolvedValue(1);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([]);

    const result = await connectionService.searchPeople(
      { query: "Bob" },
      userId,
    );

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.data[0].name).toBe("Bob");
  });

  it("returns connection status for search results", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([
      {
        id: receiverId,
        name: "Bob",
        email: "bob@test.com",
        image: null,
        student: null,
        profile: null,
        userSkills: [],
      },
    ]);
    (mockedPrisma.user.count as any).mockResolvedValue(1);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([
      {
        id: connectionId,
        requesterId: userId,
        receiverId,
        status: "ACCEPTED",
      },
    ]);

    const result = await connectionService.searchPeople({}, userId);

    expect(result.data[0].connectionStatus).toBe("CONNECTED");
    expect(result.data[0].connectionId).toBe(connectionId);
  });

  it("sets PENDING_OUTGOING for outgoing pending requests", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([
      {
        id: receiverId,
        name: "Bob",
        email: "bob@test.com",
        image: null,
        student: null,
        profile: null,
        userSkills: [],
      },
    ]);
    (mockedPrisma.user.count as any).mockResolvedValue(1);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([
      {
        id: connectionId,
        requesterId: userId,
        receiverId,
        status: "PENDING",
      },
    ]);

    const result = await connectionService.searchPeople({}, userId);

    expect(result.data[0].connectionStatus).toBe("PENDING_OUTGOING");
  });

  it("sets PENDING_INCOMING for incoming pending requests", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([
      {
        id: receiverId,
        name: "Bob",
        email: "bob@test.com",
        image: null,
        student: null,
        profile: null,
        userSkills: [],
      },
    ]);
    (mockedPrisma.user.count as any).mockResolvedValue(1);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([
      {
        id: connectionId,
        requesterId: receiverId,
        receiverId: userId,
        status: "PENDING",
      },
    ]);

    const result = await connectionService.searchPeople({}, userId);

    expect(result.data[0].connectionStatus).toBe("PENDING_INCOMING");
  });

  it("excludes blocked users from results", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([
      { blockerId: userId, blockedId: receiverId },
    ]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.count as any).mockResolvedValue(0);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([]);

    const result = await connectionService.searchPeople({}, userId);

    expect(result.data).toHaveLength(0);
  });

  it("excludes self from results", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.count as any).mockResolvedValue(0);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([]);

    await connectionService.searchPeople({}, userId);

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: expect.objectContaining({ notIn: expect.arrayContaining([userId]) }),
        }),
      }),
    );
  });

  it("applies department filter", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.count as any).mockResolvedValue(0);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([]);

    await connectionService.searchPeople(
      { department: "CSE" },
      userId,
    );

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          student: expect.objectContaining({ department: "CSE" }),
        }),
      }),
    );
  });

  it("applies pagination", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([]);
    (mockedPrisma.user.count as any).mockResolvedValue(0);
    (mockedPrisma.connection.findMany as any).mockResolvedValue([]);

    const result = await connectionService.searchPeople(
      { page: 2, limit: 10 },
      userId,
    );

    expect(mockedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(10);
  });
});

// ─── addSkill ───────────────────────────────────────────────────────────────

describe("addSkill", () => {
  it("adds a skill successfully", async () => {
    (mockedPrisma.tag.findUnique as any).mockResolvedValue({
      id: "tag-1",
      name: "JavaScript",
    });
    (mockedPrisma.userSkill.findUnique as any).mockResolvedValue(null);
    (mockedPrisma.userSkill.create as any).mockResolvedValue({
      id: "us-1",
      userId,
      tagId: "tag-1",
      tag: { id: "tag-1", name: "JavaScript" },
    });

    const result = await connectionService.addSkill({ tagId: "tag-1" }, userId);

    expect(result.id).toBe("us-1");
    expect(mockedPrisma.userSkill.create).toHaveBeenCalledOnce();
  });

  it("throws NOT_FOUND when tag does not exist", async () => {
    (mockedPrisma.tag.findUnique as any).mockResolvedValue(null);

    await expect(
      connectionService.addSkill({ tagId: "nonexistent" }, userId),
    ).rejects.toThrow("Tag not found.");
  });

  it("throws CONFLICT when skill already added", async () => {
    (mockedPrisma.tag.findUnique as any).mockResolvedValue({
      id: "tag-1",
      name: "JavaScript",
    });
    (mockedPrisma.userSkill.findUnique as any).mockResolvedValue({
      id: "us-1",
      userId,
      tagId: "tag-1",
    });

    await expect(
      connectionService.addSkill({ tagId: "tag-1" }, userId),
    ).rejects.toThrow("Skill already added.");
  });
});

// ─── removeSkill ────────────────────────────────────────────────────────────

describe("removeSkill", () => {
  it("removes own skill successfully", async () => {
    (mockedPrisma.userSkill.findUnique as any).mockResolvedValue({
      id: "us-1",
      userId,
      tagId: "tag-1",
    });
    (mockedPrisma.userSkill.delete as any).mockResolvedValue({});

    const result = await connectionService.removeSkill("us-1", userId);

    expect(result.message).toBe("Skill removed successfully.");
  });

  it("throws NOT_FOUND when skill does not exist", async () => {
    (mockedPrisma.userSkill.findUnique as any).mockResolvedValue(null);

    await expect(
      connectionService.removeSkill("nonexistent", userId),
    ).rejects.toThrow("Skill not found.");
  });

  it("throws FORBIDDEN when removing another user's skill", async () => {
    (mockedPrisma.userSkill.findUnique as any).mockResolvedValue({
      id: "us-1",
      userId: "other-user",
      tagId: "tag-1",
    });

    await expect(
      connectionService.removeSkill("us-1", userId),
    ).rejects.toThrow("You can only remove your own skills.");
  });
});

// ─── getUserSkills ──────────────────────────────────────────────────────────

describe("getUserSkills", () => {
  it("returns user skills", async () => {
    (mockedPrisma.userSkill.findMany as any).mockResolvedValue([
      {
        id: "us-1",
        userId,
        tagId: "tag-1",
        tag: { id: "tag-1", name: "JavaScript", slug: "javascript" },
      },
    ]);

    const result = await connectionService.getUserSkills(userId);

    expect(result).toHaveLength(1);
    expect(result[0].tag.name).toBe("JavaScript");
  });

  it("returns empty array when no skills", async () => {
    (mockedPrisma.userSkill.findMany as any).mockResolvedValue([]);

    const result = await connectionService.getUserSkills(userId);

    expect(result).toHaveLength(0);
  });
});

// ─── getBlockedUsers ────────────────────────────────────────────────────────

describe("getBlockedUsers", () => {
  it("returns blocked users", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([
      { blockedId: receiverId },
    ]);
    (mockedPrisma.user.findMany as any).mockResolvedValue([
      {
        id: receiverId,
        name: "Bob",
        email: "bob@test.com",
        image: null,
        student: null,
        profile: null,
      },
    ]);

    const result = await connectionService.getBlockedUsers(userId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(receiverId);
  });

  it("returns empty array when no blocked users", async () => {
    (mockedPrisma.blockedUser.findMany as any).mockResolvedValue([]);

    const result = await connectionService.getBlockedUsers(userId);

    expect(result).toHaveLength(0);
  });
});
