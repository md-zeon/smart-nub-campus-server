import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
import { messageController } from "./message.controller";
import { messageValidation } from "./message.validation";

const router: Router = Router();

// All message routes require authentication
router.use(verifySession);

// Get total unread count across all conversations
router.get("/unread", messageController.getUnreadCount);

// Create or find a DIRECT conversation with another user
router.post(
  "/conversations",
  validateRequest(messageValidation.createConversationSchema),
  messageController.createConversation,
);

// Get all conversations for the current user
router.get("/conversations", messageController.getConversations);

// Create a group conversation
router.post(
  "/groups",
  validateRequest(messageValidation.createGroupSchema),
  messageController.createGroup,
);

// Get a single conversation by ID
router.get("/conversations/:id", messageController.getConversation);

// Update conversation settings (pin, mute)
router.put(
  "/conversations/:id/settings",
  validateRequest(messageValidation.updateConversationSettingsSchema),
  messageController.updateConversationSettings,
);

// Send a message in a conversation
router.post(
  "/conversations/:id/messages",
  validateRequest(messageValidation.sendMessageSchema),
  messageController.sendMessage,
);

// Get paginated messages within a conversation
router.get(
  "/conversations/:id/messages",
  messageController.getMessages,
);

// Edit a message
router.put(
  "/conversations/:id/messages/:messageId",
  validateRequest(messageValidation.editMessageSchema),
  messageController.editMessage,
);

// Delete a message (soft delete)
router.delete(
  "/conversations/:id/messages/:messageId",
  messageController.deleteMessage,
);

// Clear all messages in a conversation (soft delete)
router.delete(
  "/conversations/:id/messages",
  messageController.clearMessages,
);

// Add/toggle reaction on a message
router.post(
  "/conversations/:id/messages/:messageId/reactions",
  validateRequest(messageValidation.reactionSchema),
  messageController.addReaction,
);

// Forward a message to another conversation
router.post(
  "/conversations/:id/messages/forward",
  messageController.forwardMessage,
);

// Mark all messages in a conversation as read
router.post(
  "/conversations/:id/read",
  messageController.markAsRead,
);

// Get unread count for a specific conversation
router.get(
  "/conversations/:id/unread",
  messageController.getConversationUnread,
);

// Update a group conversation's details
router.put(
  "/groups/:id",
  validateRequest(messageValidation.updateGroupSchema),
  messageController.updateGroup,
);

// Add members to a group conversation
router.post(
  "/groups/:id/members",
  validateRequest(messageValidation.addMemberSchema),
  messageController.addMember,
);

// Remove a member from a group conversation
router.delete(
  "/groups/:id/members/:memberId",
  messageController.removeMember,
);

// Leave a group conversation
router.post(
  "/groups/:id/leave",
  messageController.leaveGroup,
);

export const messageRoutes = router;
