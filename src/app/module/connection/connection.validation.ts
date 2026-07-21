import { z } from "zod";

const sendConnectionRequestSchema = z
  .object({
    receiverId: z.string().uuid("Invalid receiver ID"),
  })
  .strict();

const reviewConnectionSchema = z
  .object({
    status: z.enum(["ACCEPTED", "REJECTED"]),
  })
  .strict();

const blockUserSchema = z
  .object({
    blockedId: z.string().uuid("Invalid user ID"),
  })
  .strict();

const addSkillSchema = z
  .object({
    tagId: z.string().uuid("Invalid tag ID"),
  })
  .strict();

const searchPeopleSchema = z.object({
  query: z.string().optional(),
  department: z.string().optional(),
  semester: z.string().optional(),
  skills: z
    .array(z.string().uuid("Invalid skill ID"))
    .min(1)
    .optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20).optional(),
});

const getMyConnectionsQuerySchema = z.object({
  filter: z
    .enum(["ALL", "SENIORS", "JUNIORS", "SAME_SEMESTER", "FAVORITES"])
    .default("ALL")
    .optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(20).optional(),
});

export const connectionValidation = {
  sendConnectionRequestSchema,
  reviewConnectionSchema,
  blockUserSchema,
  addSkillSchema,
  searchPeopleSchema,
  getMyConnectionsQuerySchema,
};
