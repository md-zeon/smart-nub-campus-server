import { z } from "zod";

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

const listMentorsSchema = z
  .object({
    department: z.enum(DEPARTMENT_ENUM).optional(),
    industry: z.string().trim().max(100).optional(),
    topic: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const createMentorshipRequestSchema = z
  .object({
    mentorId: z.string().trim().min(1, "Invalid mentor ID"),
    topic: z.string().trim().max(200).optional(),
    message: z.string().trim().max(1000).optional(),
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

export const mentorshipValidation = {
  listMentorsSchema,
  createMentorshipRequestSchema,
  listRequestsSchema,
  updateMentorshipRequestSchema,
};
