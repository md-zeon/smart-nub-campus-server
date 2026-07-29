import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import { notificationController } from "./notification.controller";

const router: Router = Router();

// Get unread notification count
router.get("/unread-count", verifySession, notificationController.getUnreadCount);

// Get recent notifications (for dropdown preview)
router.get("/recent", verifySession, notificationController.getRecentNotifications);

// Get paginated notifications
router.get("/", verifySession, notificationController.getNotifications);

// Bulk operations (must be above /:id routes to avoid param match)
router.patch("/bulk/read", verifySession, notificationController.bulkMarkAsRead);
router.delete("/bulk", verifySession, notificationController.bulkDelete);

// Mark all notifications as read (must be above /:id/read to avoid param match)
router.patch("/read-all", verifySession, notificationController.markAllAsRead);

// Mark a single notification as read
router.patch(
  "/:id/read",
  verifySession,
  notificationController.markAsRead,
);

// Delete a single notification
router.delete(
  "/:id",
  verifySession,
  notificationController.deleteNotification,
);

export const notificationRoutes = router;
