import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { getSocketServer } from "../../lib/socket/socket-server";
import { buildPaginationQuery, calculatePaginationMeta } from "../../utils/pagination";
import { CreateNotificationInput, NotificationListQuery } from "./notification.interface";

/**
 * Create an in-app notification for a user.
 * Also emits a real-time `notification:new` Socket.IO event to the user's room.
 */
const createNotification = async (input: CreateNotificationInput) => {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      senderId: input.senderId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
    include: {
      sender: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  try {
    const io = getSocketServer();
    io.to(`user:${input.userId}`).emit("notification:new", {
      id: notification.id,
      userId: notification.userId,
      senderId: notification.senderId,
      sender: notification.sender
        ? { id: notification.sender.id, name: notification.sender.name, image: notification.sender.image }
        : undefined,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      isRead: notification.isRead,
      metadata: notification.metadata as Record<string, unknown> | undefined,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  return notification;
};

/**
 * Get paginated notifications for a user.
 */
const getNotifications = async (userId: string, query: NotificationListQuery) => {
  const { page = 1, limit = 20, unreadOnly = false, type } = query;
  const { skip, take } = buildPaginationQuery({ page, limit, sortBy: "createdAt", sortOrder: "desc" });

  const where: Record<string, unknown> = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }
  if (type) {
    where.type = type;
  }

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: notifications,
    meta: calculatePaginationMeta(total, page, limit),
  };
};

/**
 * Get the most recent notifications for the dropdown preview.
 */
const getRecentNotifications = async (userId: string, limit = 5) => {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  return notifications;
};

/**
 * Get count of unread notifications for a user.
 */
const getUnreadCount = async (userId: string) => {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { unreadCount: count };
};

/**
 * Mark a single notification as read.
 */
const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return null;
  }

  if (notification.userId !== userId) {
    return null;
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updated;
};

/**
 * Mark all of a user's notifications as read.
 */
const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { updatedCount: result.count };
};

/**
 * Delete a single notification.
 */
const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    return null;
  }

  if (notification.userId !== userId) {
    return null;
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return { deleted: true };
};

/**
 * Bulk mark notifications as read.
 */
const bulkMarkAsRead = async (ids: string[], userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: ids },
      userId,
    },
    data: { isRead: true },
  });

  return { updatedCount: result.count };
};

/**
 * Bulk delete notifications.
 */
const bulkDelete = async (ids: string[], userId: string) => {
  const result = await prisma.notification.deleteMany({
    where: {
      id: { in: ids },
      userId,
    },
  });

  return { deletedCount: result.count };
};

export const notificationService = {
  createNotification,
  getNotifications,
  getRecentNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  bulkMarkAsRead,
  bulkDelete,
};
