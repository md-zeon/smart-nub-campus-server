import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { messageService } from "./message.service";
import {
  GetConversationsQuery,
  GetMessagesQuery,
} from "./message.interface";

/**
 * Create or find a DIRECT conversation with another user.
 */
const createConversation = catchAsync(async (req, res) => {
  const result = await messageService.findOrCreateConversation(
    req.user.id,
    req.body.participantId,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Conversation retrieved or created successfully.",
    data: result,
  });
});

/**
 * Get all conversations for the current user.
 */
const getConversations = catchAsync(async (req, res) => {
  const query: GetConversationsQuery = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  const result = await messageService.getConversations(req.user.id, query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Conversations retrieved successfully.",
    data: result,
  });
});

/**
 * Get a single conversation by ID.
 */
const getConversation = catchAsync(async (req, res) => {
  const conversationId = req.params.id as string;
  const result = await messageService.getConversation(
    conversationId,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Conversation retrieved successfully.",
    data: result,
  });
});

/**
 * Send a message in a conversation.
 */
const sendMessage = catchAsync(async (req, res) => {
  const conversationId = req.params.id as string;
  const result = await messageService.sendMessage(
    conversationId,
    req.body,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Message sent successfully.",
    data: result,
  });
});

/**
 * Get paginated messages within a conversation.
 */
const getMessages = catchAsync(async (req, res) => {
  const conversationId = req.params.id as string;
  const query: GetMessagesQuery = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  const result = await messageService.getMessages(
    conversationId,
    req.user.id,
    query,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Messages retrieved successfully.",
    data: result,
  });
});

/**
 * Mark all messages in a conversation as read.
 */
const markAsRead = catchAsync(async (req, res) => {
  const conversationId = req.params.id as string;
  const result = await messageService.markAsRead(
    conversationId,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Create a group conversation.
 */
const createGroup = catchAsync(async (req, res) => {
  const result = await messageService.createGroup(req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Group created successfully.",
    data: result,
  });
});

/**
 * Update a group conversation's details.
 */
const updateGroup = catchAsync(async (req, res) => {
  const conversationId = req.params.id as string;
  const result = await messageService.updateGroup(
    conversationId,
    req.body,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Group updated successfully.",
    data: result,
  });
});

/**
 * Add members to a group conversation.
 */
const addMember = catchAsync(async (req, res) => {
  const conversationId = req.params.id as string;
  const result = await messageService.addMember(
    conversationId,
    req.body,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Remove a member from a group conversation.
 */
const removeMember = catchAsync(async (req, res) => {
  const conversationId = req.params.id as string;
  const memberId = req.params.memberId as string;
  const result = await messageService.removeMember(
    conversationId,
    memberId,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Leave a group conversation.
 */
const leaveGroup = catchAsync(async (req, res) => {
  const conversationId = req.params.id as string;
  const result = await messageService.leaveGroup(
    conversationId,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Get total unread count across all conversations.
 */
const getUnreadCount = catchAsync(async (req, res) => {
  const result = await messageService.getUnreadCount(req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Unread count retrieved successfully.",
    data: result,
  });
});

/**
 * Get unread count for a specific conversation.
 */
const getConversationUnread = catchAsync(async (req, res) => {
  const conversationId = req.params.id as string;
  const result = await messageService.getConversationUnread(
    conversationId,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Conversation unread count retrieved successfully.",
    data: result,
  });
});

export const messageController = {
  createConversation,
  getConversations,
  getConversation,
  sendMessage,
  getMessages,
  markAsRead,
  createGroup,
  updateGroup,
  addMember,
  removeMember,
  leaveGroup,
  getUnreadCount,
  getConversationUnread,
};
