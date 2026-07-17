import { z } from "zod";

const createResourceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    description: z.string().trim().optional(),
    fileUrl: z.string().url("Invalid file URL"),
    filePublicId: z.string().optional(),
    fileType: z.string().min(1, "File type is required"),
    fileSize: z.number().int().positive("File size must be positive"),
    courseId: z.string().uuid("Invalid course ID"),
    categoryId: z.string().uuid("Invalid category ID"),
    tags: z
      .array(z.string().trim().min(1))
      .min(1, "At least one tag is required"),
  })
  .strict();

const updateResourceSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    description: z.string().trim().optional(),
    categoryId: z.string().uuid("Invalid category ID").optional(),
    tags: z.array(z.string().trim().min(1)).min(1).optional(),
  })
  .strict();

const createCommentSchema = z
  .object({
    content: z.string().trim().min(1, "Comment content is required"),
    parentId: z.string().uuid("Invalid parent comment ID").optional(),
  })
  .strict();

const reportResourceSchema = z
  .object({
    reason: z.enum([
      "SPAM",
      "COPYRIGHT",
      "OFFENSIVE_CONTENT",
      "DUPLICATE",
      "WRONG_CATEGORY",
      "BROKEN_FILE",
      "MALWARE",
      "OTHER",
    ]),
    description: z.string().trim().optional(),
  })
  .strict();

const reviewReportSchema = z
  .object({
    status: z.enum(["REVIEWED", "DISMISSED", "ACTION_TAKEN"]),
  })
  .strict();

export const resourceValidation = {
  createResourceSchema,
  updateResourceSchema,
  createCommentSchema,
  reportResourceSchema,
  reviewReportSchema,
};
