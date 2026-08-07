import { z } from "zod";

const searchQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(1, "Search query is required")
      .max(200, "Search query must be at most 200 characters"),
    type: z
      .enum([
        "all",
        "course",
        "resource",
        "discussion",
        "question",
        "team",
        "event",
        "job",
        "mentor",
        "user",
      ])
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    department: z.string().trim().optional(),
    categoryId: z.string().optional(),
    courseId: z.string().optional(),
  })
  .strict();

export const searchValidation = {
  searchQuerySchema,
};
