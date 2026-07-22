import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import { notificationController } from "./notification.controller";

const router: Router = Router();

// Get unread notification count
router.get("/unread-count", verifySession, notificationController.getUnreadCount);

// Get paginated notifications
router.get("/", verifySession, notificationController.getNotifications);

// Mark all notifications as read (must be above /:id/read to avoid param match)
router.patch("/read-all", verifySession, notificationController.markAllAsRead);

// Mark a single notification as read
router.patch(
  "/:id/read",
  verifySession,
  notificationController.markAsRead,
);

export const notificationRoutes = router;
