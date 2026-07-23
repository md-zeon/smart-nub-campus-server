import { z } from "zod";

const createQuestionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    content: z.string().trim().min(1, "Content is required").max(10000, "Content must be at most 10,000 characters"),
    courseId: z.string().uuid("Invalid course ID").optional(),
    categoryId: z.string().uuid("Invalid category ID"),
    tagIds: z.array(z.string().uuid("Invalid tag ID")).optional(),
  })
  .strict();

const updateQuestionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    content: z.string().trim().min(1, "Content cannot be empty").max(10000, "Content must be at most 10,000 characters").optional(),
    tagIds: z.array(z.string().uuid("Invalid tag ID")).optional(),
  })
  .strict();

const createAnswerSchema = z
  .object({
    content: z.string().trim().min(1, "Answer content is required").max(10000, "Answer must be at most 10,000 characters"),
  })
  .strict();

const voteSchema = z
  .object({
    type: z.enum(["UP", "DOWN"]),
  })
  .strict();

export const qaValidation = {
  createQuestionSchema,
  updateQuestionSchema,
  createAnswerSchema,
  voteSchema,
};
