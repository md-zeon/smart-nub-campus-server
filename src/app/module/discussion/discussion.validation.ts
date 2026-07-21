import { z } from "zod";

const createDiscussionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    content: z.string().trim().min(1, "Content is required"),
    categoryId: z.string().uuid("Invalid category ID"),
    courseId: z.string().uuid("Invalid course ID").optional(),
    tagIds: z.array(z.string().uuid("Invalid tag ID")).optional(),
    visibility: z.enum(["PUBLIC", "DEPARTMENT", "BATCH"]).optional(),
  })
  .strict();

const updateDiscussionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    content: z.string().trim().min(1, "Content cannot be empty").optional(),
    categoryId: z.string().uuid("Invalid category ID").optional(),
    courseId: z.string().uuid("Invalid course ID").optional(),
    tagIds: z.array(z.string().uuid("Invalid tag ID")).optional(),
    visibility: z.enum(["PUBLIC", "DEPARTMENT", "BATCH"]).optional(),
  })
  .strict();

const createReplySchema = z
  .object({
    content: z.string().trim().min(1, "Reply content is required"),
    parentId: z.string().uuid("Invalid parent reply ID").optional(),
  })
  .strict();

const voteSchema = z
  .object({
    type: z.enum(["UP", "DOWN"]),
  })
  .strict();

export const discussionValidation = {
  createDiscussionSchema,
  updateDiscussionSchema,
  createReplySchema,
  voteSchema,
};
