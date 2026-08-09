import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(async (fns: any) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      return fns((...args: any[]) => args[args.length - 1]);
    }),
  },
}));

vi.mock("../../../../app/lib/socket/socket-server", () => ({
  getSocketServer: vi.fn().mockReturnValue({
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
  }),
}));

import { notificationService } from "../notification.service";
import { prisma } from "../../../../app/lib/prisma";
import { getSocketServer } from "../../../../app/lib/socket/socket-server";

const mockPrisma = vi.mocked(prisma);
const mockGetSocketServer = vi.mocked(getSocketServer);

const userId = "user-001";
const notificationId = "notif-001";

const baseNotification = {
  id: notificationId,
  userId,
  senderId: null,
  type: "MESSAGE_RECEIVED",
  title: "New message",
  message: "You have a new message",
  link: null,
  metadata: null,
  isRead: false,
  createdAt: new Date("2025-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createNotification", () => {
  it("creates a notification and emits a socket event", async () => {
    mockPrisma.notification.create.mockResolvedValue({
      ...baseNotification,
      sender: { id: "sender-1", name: "Bob", image: null },
    } as never);

    const result = await notificationService.createNotification({
      userId,
      senderId: "sender-1",
      type: "MESSAGE_RECEIVED",
      title: "New message",
      message: "You have a new message",
      link: "/messages/1",
      metadata: { extra: "info" },
    });

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          senderId: "sender-1",
          type: "MESSAGE_RECEIVED",
          title: "New message",
          message: "You have a new message",
          link: "/messages/1",
          metadata: { extra: "info" },
        }),
      }),
    );
    expect(mockGetSocketServer().to).toHaveBeenCalledWith(`user:${userId}`);
    expect(result.id).toBe(notificationId);
  });

  it("defaults senderId, link and metadata when not provided", async () => {
    mockPrisma.notification.create.mockResolvedValue(
      baseNotification as never,
    );

    await notificationService.createNotification({
      userId,
      type: "MESSAGE_RECEIVED",
      title: "New message",
      message: "You have a new message",
    });

    const createCall = mockPrisma.notification.create.mock.calls[0][0];
    expect(createCall.data.senderId).toBeNull();
    expect(createCall.data.link).toBeNull();
  });

  it("does not throw when socket server is unavailable", async () => {
    mockPrisma.notification.create.mockResolvedValue(
      baseNotification as never,
    );
    mockGetSocketServer.mockImplementation(() => {
      throw new Error("socket not ready");
    });

    const result = await notificationService.createNotification({
      userId,
      type: "MESSAGE_RECEIVED",
      title: "New message",
      message: "You have a new message",
    });

    expect(result.id).toBe(notificationId);
  });
});

describe("getNotifications", () => {
  it("returns paginated notifications", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([
      baseNotification,
    ] as never);
    mockPrisma.notification.count.mockResolvedValue(1 as never);

    const result = await notificationService.getNotifications(userId, {});

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 20, total: 1 }),
    );
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it("filters unread notifications", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([] as never);
    mockPrisma.notification.count.mockResolvedValue(0 as never);

    await notificationService.getNotifications(userId, { unreadOnly: true });

    const where = mockPrisma.notification.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ userId, isRead: false });
  });

  it("filters by type", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([] as never);
    mockPrisma.notification.count.mockResolvedValue(0 as never);

    await notificationService.getNotifications(userId, {
      type: "MESSAGE_RECEIVED",
    });

    const where = mockPrisma.notification.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ userId, type: "MESSAGE_RECEIVED" });
  });

  it("applies pagination offset", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([] as never);
    mockPrisma.notification.count.mockResolvedValue(0 as never);

    await notificationService.getNotifications(userId, { page: 3, limit: 10 });

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });
});

describe("getRecentNotifications", () => {
  it("returns the most recent notifications with default limit", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([
      baseNotification,
    ] as never);

    const result = await notificationService.getRecentNotifications(userId);

    expect(result).toHaveLength(1);
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});

describe("getUnreadCount", () => {
  it("returns the unread notification count", async () => {
    mockPrisma.notification.count.mockResolvedValue(3 as never);

    const result = await notificationService.getUnreadCount(userId);

    expect(result).toEqual({ unreadCount: 3 });
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId, isRead: false },
    });
  });
});

describe("markAsRead", () => {
  it("marks the notification as read when owned by the user", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(
      baseNotification as never,
    );
    mockPrisma.notification.update.mockResolvedValue({
      ...baseNotification,
      isRead: true,
    } as never);

    const result = await notificationService.markAsRead(notificationId, userId);

    expect(result?.isRead).toBe(true);
    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: notificationId },
      data: { isRead: true },
    });
  });

  it("returns null when the notification does not exist", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(null as never);

    const result = await notificationService.markAsRead("missing", userId);

    expect(result).toBeNull();
    expect(mockPrisma.notification.update).not.toHaveBeenCalled();
  });

  it("returns null when the notification belongs to another user", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue({
      ...baseNotification,
      userId: "someone-else",
    } as never);

    const result = await notificationService.markAsRead(notificationId, userId);

    expect(result).toBeNull();
  });
});

describe("markAllAsRead", () => {
  it("marks all unread notifications as read", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 4 } as never);

    const result = await notificationService.markAllAsRead(userId);

    expect(result).toEqual({ updatedCount: 4 });
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  });
});

describe("deleteNotification", () => {
  it("deletes the notification when owned by the user", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(
      baseNotification as never,
    );
    mockPrisma.notification.delete.mockResolvedValue({} as never);

    const result = await notificationService.deleteNotification(
      notificationId,
      userId,
    );

    expect(result).toEqual({ deleted: true });
    expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
      where: { id: notificationId },
    });
  });

  it("returns null when the notification does not exist", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(null as never);

    const result = await notificationService.deleteNotification(
      "missing",
      userId,
    );

    expect(result).toBeNull();
  });

  it("returns null when the notification belongs to another user", async () => {
    mockPrisma.notification.findUnique.mockResolvedValue({
      ...baseNotification,
      userId: "someone-else",
    } as never);

    const result = await notificationService.deleteNotification(
      notificationId,
      userId,
    );

    expect(result).toBeNull();
    expect(mockPrisma.notification.delete).not.toHaveBeenCalled();
  });
});

describe("bulkMarkAsRead", () => {
  it("marks multiple notifications as read for the user", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 } as never);

    const result = await notificationService.bulkMarkAsRead(
      ["n1", "n2"],
      userId,
    );

    expect(result).toEqual({ updatedCount: 2 });
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["n1", "n2"] }, userId },
      data: { isRead: true },
    });
  });
});

describe("bulkDelete", () => {
  it("deletes multiple notifications for the user", async () => {
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 3 } as never);

    const result = await notificationService.bulkDelete(["n1", "n2"], userId);

    expect(result).toEqual({ deletedCount: 3 });
    expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["n1", "n2"] }, userId },
    });
  });
});
