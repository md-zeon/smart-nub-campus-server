import { z } from "zod";

const createDiscussionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    content: z.string().trim().min(1, "Content is required").max(10000, "Content must be at most 10,000 characters"),
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
    content: z.string().trim().min(1, "Content cannot be empty").max(10000, "Content must be at most 10,000 characters").optional(),
    categoryId: z.string().uuid("Invalid category ID").optional(),
    courseId: z.string().uuid("Invalid course ID").optional(),
    tagIds: z.array(z.string().uuid("Invalid tag ID")).optional(),
    visibility: z.enum(["PUBLIC", "DEPARTMENT", "BATCH"]).optional(),
  })
  .strict();

const createReplySchema = z
  .object({
    content: z.string().trim().min(1, "Reply content is required").max(10000, "Reply must be at most 10,000 characters"),
    parentId: z.string().uuid("Invalid parent reply ID").optional(),
  })
  .strict();

const voteSchema = z
  .object({
    type: z.enum(["UP", "DOWN"]),
  })
  .strict();

const listRepliesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.enum(["upvotes", "newest", "oldest"]).optional().default("newest"),
});

export const discussionValidation = {
  createDiscussionSchema,
  updateDiscussionSchema,
  createReplySchema,
  voteSchema,
  listRepliesSchema,
};
