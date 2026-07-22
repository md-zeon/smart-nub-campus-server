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
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    },
  });

  try {
    const io = getSocketServer();
    io.to(`user:${input.userId}`).emit("notification:new", {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      isRead: notification.isRead,
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
  const { page = 1, limit = 20, unreadOnly = false } = query;
  const { skip, take } = buildPaginationQuery({ page, limit, sortBy: "createdAt", sortOrder: "desc" });

  const where: Record<string, unknown> = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: notifications,
    meta: calculatePaginationMeta(total, page, limit),
  };
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

export const notificationService = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
