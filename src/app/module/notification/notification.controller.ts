import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { notificationService } from "./notification.service";
import { NotificationListQuery } from "./notification.interface";

const createNotification = catchAsync(async (req, res) => {
  const result = await notificationService.createNotification({
    userId: req.body.userId,
    type: req.body.type,
    title: req.body.title,
    message: req.body.message,
    link: req.body.link,
  });
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Notification created successfully.",
    data: result,
  });
});

const getNotifications = catchAsync(async (req, res) => {
  const query: NotificationListQuery = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    unreadOnly: req.query.unreadOnly === "true",
  };
  const result = await notificationService.getNotifications(req.user.id, query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notifications retrieved successfully.",
    data: result,
  });
});

const getUnreadCount = catchAsync(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Unread count retrieved successfully.",
    data: result,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const notificationId = req.params.id as string;
  const result = await notificationService.markAsRead(notificationId, req.user.id);
  if (!result) {
    sendResponse(res, {
      httpStatusCode: status.NOT_FOUND,
      success: false,
      message: "Notification not found or unauthorized.",
      data: null,
    });
    return;
  }
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification marked as read.",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All notifications marked as read.",
    data: result,
  });
});

export const notificationController = {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
