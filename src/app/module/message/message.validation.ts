import { z } from "zod";

const createConversationSchema = z
  .object({
    // Better Auth user IDs are not UUIDs, so accept any non-empty string.
    participantId: z.string().min(1, "Invalid participant ID"),
  })
  .strict();

const sendMessageSchema = z
  .object({
    content: z.string().min(1, "Message content is required").max(5000, "Message content too long"),
    type: z.enum(["TEXT", "IMAGE", "FILE"]).default("TEXT").optional(),
    replyToId: z.string().uuid("Invalid reply message ID").optional(),
    fileUrl: z.string().url("Invalid file URL").optional(),
    filePublicId: z.string().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().int().positive().optional(),
    isForwarded: z.boolean().optional(),
    forwardedFromId: z.string().optional(),
  })
  .strict();

const editMessageSchema = z
  .object({
    content: z.string().min(1, "Message content is required").max(5000, "Message content too long"),
  })
  .strict();

const reactionSchema = z
  .object({
    emoji: z.string().min(1, "Emoji is required").max(16, "Emoji too long"),
  })
  .strict();

const createGroupSchema = z
  .object({
    name: z.string().min(1, "Group name is required").max(100, "Group name too long"),
    description: z.string().max(500, "Description too long").optional(),
    participantIds: z
      // Better Auth user IDs are not UUIDs, so accept any non-empty string.
      .array(z.string().min(1, "Invalid participant ID"))
      .min(1, "At least one participant is required"),
  })
  .strict();

const updateGroupSchema = z
  .object({
    name: z.string().min(1, "Group name is required").max(100, "Group name too long").optional(),
    description: z.string().max(500, "Description too long").optional(),
    groupImage: z.string().url("Invalid image URL").optional(),
  })
  .strict();

const addMemberSchema = z
  .object({
    participantIds: z
      // Better Auth user IDs are not UUIDs, so accept any non-empty string.
      .array(z.string().min(1, "Invalid participant ID"))
      .min(1, "At least one participant is required"),
  })
  .strict();

const getMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20).optional(),
  search: z.string().max(200).optional(),
});

const getConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20).optional(),
});

const updateConversationSettingsSchema = z
  .object({
    isPinned: z.boolean().optional(),
    isMuted: z.boolean().optional(),
  })
  .strict();

export const messageValidation = {
  createConversationSchema,
  sendMessageSchema,
  editMessageSchema,
  reactionSchema,
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  getMessagesQuerySchema,
  getConversationsQuerySchema,
  updateConversationSettingsSchema,
};
