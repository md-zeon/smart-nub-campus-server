import { z } from "zod";
import { MentorshipSessionStatus } from "../../../generated/prisma/enums";

const DEPARTMENT_ENUM = [
  "CSE",
  "ECSE",
  "EEE",
  "EEEE",
  "BBA",
  "MBA",
  "ENGLISH",
  "MAE",
  "BANGLA",
  "MAB",
  "LLB",
  "MPH",
  "BPH",
  "ME",
  "CIVIL",
  "BTX",
  "EBTX",
] as const;

const MEETING_PREFERENCES = ["ONLINE", "IN_PERSON", "HYBRID", "FLEXIBLE"] as const;

const listMentorsSchema = z
  .object({
    department: z.enum(DEPARTMENT_ENUM).optional(),
    industry: z.string().trim().max(100).optional(),
    topic: z.string().trim().max(100).optional(),
    sort: z.enum(["relevance", "name"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const createMentorshipRequestSchema = z
  .object({
    mentorId: z.string().trim().min(1, "Invalid mentor ID"),
    topic: z.string().trim().max(200).optional(),
    message: z.string().trim().max(1000).optional(),
    goals: z
      .array(z.string().trim().min(1, "Goal cannot be empty").max(200))
      .min(1, "Add at least one goal you'd like to work on.")
      .max(5, "Keep it focused — up to 5 goals.")
      .default([]),
  })
  .strict();

const listRequestsSchema = z
  .object({
    role: z.enum(["mentor", "mentee"]).optional(),
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const updateMentorshipRequestSchema = z
  .object({
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"]),
  })
  .strict();

const listMentorshipsSchema = z
  .object({
    status: z.enum(["ACTIVE", "COMPLETED", "ENDED"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const paramsIdSchema = z.object({ id: z.string().trim().min(1) }).strict();

const goalIdSchema = z.object({ goalId: z.string().trim().min(1) }).strict();

const sessionIdSchema = z
  .object({ sessionId: z.string().trim().min(1) })
  .strict();

const createMentorshipGoalSchema = z
  .object({
    title: z.string().trim().min(3, "Goal should be at least 3 characters.").max(200),
    description: z.string().trim().max(2000).optional(),
    dueDate: z.string().datetime().optional(),
  })
  .strict();

const updateMentorshipGoalSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  })
  .strict();

const createMentorshipSessionSchema = z
  .object({
    scheduledAt: z.string().datetime("Please provide a valid date and time."),
    durationMinutes: z.coerce.number().int().min(5).max(240).optional(),
    format: z.enum(MEETING_PREFERENCES).optional(),
    location: z.string().trim().max(500).optional(),
    agenda: z.string().trim().max(10000).optional(),
  })
  .strict();

const updateMentorshipSessionSchema = z
  .object({
    scheduledAt: z.string().datetime().optional(),
    durationMinutes: z.coerce.number().int().min(5).max(240).optional(),
    format: z.enum(MEETING_PREFERENCES).optional(),
    location: z.string().trim().max(500).nullable().optional(),
    agenda: z.string().trim().max(10000).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    actionItems: z.string().trim().max(5000).nullable().optional(),
    status: z.enum([
      MentorshipSessionStatus.SCHEDULED,
      MentorshipSessionStatus.COMPLETED,
      MentorshipSessionStatus.CANCELLED,
    ]).optional(),
  })
  .strict();

const messagesQuerySchema = z
  .object({
    before: z.string().datetime().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const sendMessageSchema = z
  .object({
    body: z.string().trim().min(1, "Message cannot be empty.").max(5000),
  })
  .strict();

const completeMentorshipSchema = z
  .object({
    rating: z.coerce.number().int().min(1, "Rating must be between 1 and 5.").max(5),
    feedback: z.string().trim().max(2000).optional(),
  })
  .strict();

export const mentorshipValidation = {
  listMentorsSchema,
  createMentorshipRequestSchema,
  listRequestsSchema,
  updateMentorshipRequestSchema,
  listMentorshipsSchema,
  paramsIdSchema,
  goalIdSchema,
  sessionIdSchema,
  createMentorshipGoalSchema,
  updateMentorshipGoalSchema,
  createMentorshipSessionSchema,
  updateMentorshipSessionSchema,
  messagesQuerySchema,
  sendMessageSchema,
  completeMentorshipSchema,
};
