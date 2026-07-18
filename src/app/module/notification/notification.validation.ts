import { z } from "zod";

const createNotificationSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
    type: z.enum([
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
    ]),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    message: z.string().trim().min(1, "Message is required"),
    link: z.string().url("Invalid link URL").optional(),
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
});

const markAsReadSchema = z
  .object({
    notificationId: z.string().uuid("Invalid notification ID"),
  })
  .strict();

export const notificationValidation = {
  createNotificationSchema,
  listNotificationsSchema,
  markAsReadSchema,
};
