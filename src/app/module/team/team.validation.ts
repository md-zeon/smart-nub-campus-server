import { z } from "zod";

const createTeamRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    description: z.string().trim().min(1, "Description is required"),
    lookingForCount: z
      .number()
      .int()
      .positive("Max team size must be positive"),
    projectName: z.string().trim().optional(),
    deadline: z.string().datetime().optional(),
    category: z.string().trim().optional(),
    skillTagIds: z
      .array(z.string().uuid("Invalid skill tag ID"))
      .min(1, "At least one skill tag is required"),
  })
  .strict();

const updateTeamRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    description: z.string().trim().min(1, "Description cannot be empty").optional(),
    lookingForCount: z
      .number()
      .int()
      .positive("Max team size must be positive")
      .optional(),
    status: z.enum(["CLOSED"]).optional(),
    projectName: z.string().trim().optional(),
    deadline: z.string().datetime().optional(),
    category: z.string().trim().optional(),
    skillTagIds: z
      .array(z.string().uuid("Invalid skill tag ID"))
      .min(1, "At least one skill tag is required")
      .optional(),
  })
  .strict();

const applyToTeamSchema = z
  .object({
    message: z.string().trim().optional(),
  })
  .strict();

const reviewApplicationSchema = z
  .object({
    status: z.enum(["ACCEPTED", "REJECTED"]),
  })
  .strict();

export const teamValidation = {
  createTeamRequestSchema,
  updateTeamRequestSchema,
  applyToTeamSchema,
  reviewApplicationSchema,
};
