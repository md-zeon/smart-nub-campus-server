import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
import { notificationController } from "./notification.controller";
import { notificationValidation } from "./notification.validation";

const router: Router = Router();

// Get unread notification count
router.get("/unread-count", verifySession, notificationController.getUnreadCount);

// Get paginated notifications
router.get("/", verifySession, notificationController.getNotifications);

// Mark a single notification as read
router.patch(
  "/:id/read",
  verifySession,
  notificationController.markAsRead,
);

// Mark all notifications as read
router.patch("/read-all", verifySession, notificationController.markAllAsRead);

// Create a notification (internal — used by other modules)
router.post(
  "/",
  verifySession,
  validateRequest(notificationValidation.createNotificationSchema),
  notificationController.createNotification,
);

export const notificationRoutes = router;
