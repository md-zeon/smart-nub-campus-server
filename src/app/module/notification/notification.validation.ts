import { z } from "zod";

const notificationTypeEnum = z.enum([
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
  "MESSAGE",
  "MESSAGE_REQUEST",
  "RESOURCE_UPVOTE",
  "RESOURCE_DOWNVOTE",
  "RESOURCE_COMMENT",
  "RESOURCE_REPORT_REVIEWED",
  "DISCUSSION_REPLY",
  "DISCUSSION_MENTION",
  "QUESTION_ANSWER",
  "QUESTION_ACCEPTED",
  "TEAM_APPLICATION",
  "TEAM_APPLICATION_ACCEPTED",
  "TEAM_APPLICATION_REJECTED",
  "EVENT_REMINDER",
  "BADGE_UNLOCKED",
  "SYSTEM",
]);

const createNotificationSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
    senderId: z.string().uuid("Invalid sender ID").optional(),
    type: notificationTypeEnum,
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    message: z.string().trim().min(1, "Message is required"),
    link: z.string().url("Invalid link URL").optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const listNotificationsSchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .optional(),
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val) || 20, 100))
    .optional(),
  unreadOnly: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  type: notificationTypeEnum.optional(),
});

const markAsReadSchema = z
  .object({
    notificationId: z.string().uuid("Invalid notification ID"),
  })
  .strict();

const deleteNotificationSchema = z
  .object({
    id: z.string().uuid("Invalid notification ID"),
  })
  .strict();

export const notificationValidation = {
  createNotificationSchema,
  listNotificationsSchema,
  markAsReadSchema,
  deleteNotificationSchema,
};
