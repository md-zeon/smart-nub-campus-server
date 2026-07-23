import { z } from "zod";

const awardPointsSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
    event: z.enum([
      "RESOURCE_UPLOADED",
      "RESOURCE_UPVOTED_RECEIVED",
      "DISCUSSION_CREATED",
      "DISCUSSION_UPVOTED_RECEIVED",
      "QUESTION_ASKED",
      "QUESTION_UPVOTED_RECEIVED",
      "ANSWER_UPVOTED_RECEIVED",
      "ANSWER_ACCEPTED",
      "REPLY_POSTED",
      "PROFILE_COMPLETED",
      "BADGE_UNLOCKED",
      "RESOURCE_DOWNVOTED_RECEIVED",
      "RESOURCE_DOWNVOTED_GIVEN",
      "DISCUSSION_DOWNVOTED_RECEIVED",
      "QUESTION_DOWNVOTED_RECEIVED",
      "ANSWER_DOWNVOTED_RECEIVED",
      "ANSWER_UNACCEPTED",
      "CONTENT_REMOVED",
      "ADMIN_ADJUSTMENT",
      "VOTE_REVERSAL",
    ]),
    points: z.number().int().optional(),
    reason: z.string().min(1, "Reason is required"),
    source: z.string().optional(),
  })
  .strict();

const adminAdjustPointsSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID"),
    points: z
      .number()
      .int()
      .min(-1000, "Points adjustment cannot be less than -1000")
      .max(1000, "Points adjustment cannot exceed 1000"),
    reason: z
      .string()
      .min(1, "Reason is required")
      .max(500, "Reason must be at most 500 characters"),
  })
  .strict();

const handleVoteSchema = z
  .object({
    recipientId: z.string().uuid("Invalid recipient ID"),
    contentType: z.enum(["RESOURCE", "DISCUSSION", "QUESTION", "ANSWER"]),
    contentId: z.string().uuid("Invalid content ID"),
    voteType: z.enum(["UP", "DOWN"]),
  })
  .strict();

const leaderboardSchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .optional(),
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val) || 10, 50))
    .optional(),
});

const reputationHistorySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .optional(),
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val) || 20, 100))
    .optional(),
});

export const gamificationValidation = {
  awardPointsSchema,
  adminAdjustPointsSchema,
  handleVoteSchema,
  leaderboardSchema,
  reputationHistorySchema,
};
