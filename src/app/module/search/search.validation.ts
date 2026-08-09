import { z } from "zod";

export const SEARCH_ENTITIES = [
  "people",
  "resources",
  "discussions",
  "questions",
  "teams",
  "events",
  "courses",
  "jobs",
  "mentorship",
] as const;

const searchQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(1, "Search query is required")
      .max(120, "Search query must be at most 120 characters"),
    entity: z.enum(["all", ...SEARCH_ENTITIES]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    department: z.string().trim().optional(),
    categoryId: z.string().optional(),
    courseId: z.string().optional(),
  })
  .strict();

const clickSchema = z
  .object({
    query: z.string().trim().min(1).max(120),
    entity: z.enum(SEARCH_ENTITIES),
    resultId: z.string().optional(),
    position: z.coerce.number().int().min(1).optional(),
  })
  .strict();

export const searchValidation = {
  searchQuerySchema,
  clickSchema,
};
