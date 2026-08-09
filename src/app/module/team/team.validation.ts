import { z } from "zod";

const APPLICATION_FORM_FIELD_KEYS = [
  "name",
  "email",
  "github",
  "linkedin",
  "portfolio",
  "website",
  "phone",
  "location",
  "studentId",
  "department",
  "semester",
] as const;

const applicationFormSchema = z
  .object({
    fields: z
      .array(
        z.object({
          key: z.enum(APPLICATION_FORM_FIELD_KEYS),
          required: z.boolean().default(false),
        }),
      )
      .max(20, "Cannot configure more than 20 fields")
      .optional(),
    questions: z
      .array(
        z.object({
          id: z.string().uuid("Invalid question ID"),
          label: z.string().trim().min(1, "Question label is required").max(200, "Question label must be at most 200 characters"),
          type: z.enum(["SHORT_TEXT", "PARAGRAPH"]),
          required: z.boolean().default(false),
        }),
      )
      .max(20, "Cannot add more than 20 custom questions")
      .optional(),
  })
  .strict();

const createTeamRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters"),
    lookingForCount: z
      .number()
      .int()
      .min(1, "Team size must be at least 1")
      .max(20, "Team size cannot exceed 20"),
    projectName: z.string().trim().max(200, "Project name must be at most 200 characters").optional(),
    deadline: z.string().datetime().optional(),
    category: z.string().trim().max(100, "Category must be at most 100 characters").optional(),
    difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
    meetingPreference: z.enum(["ONLINE", "IN_PERSON", "HYBRID", "FLEXIBLE"]).optional(),
    contactInfo: z.string().trim().max(500, "Contact info must be at most 500 characters").optional(),
    applicationForm: applicationFormSchema.optional(),
    skillTagIds: z
      .array(z.string().uuid("Invalid skill tag ID"))
      .min(1, "At least one skill tag is required")
      .max(10, "Cannot add more than 10 skill tags"),
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
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .optional(),
    lookingForCount: z
      .number()
      .int()
      .min(1, "Team size must be at least 1")
      .max(20, "Team size cannot exceed 20")
      .optional(),
    status: z.enum(["CLOSED"]).optional(),
    projectName: z.string().trim().max(200, "Project name must be at most 200 characters").optional(),
    deadline: z.string().datetime().optional(),
    category: z.string().trim().max(100, "Category must be at most 100 characters").optional(),
    difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
    meetingPreference: z.enum(["ONLINE", "IN_PERSON", "HYBRID", "FLEXIBLE"]).optional(),
    contactInfo: z.string().trim().max(500, "Contact info must be at most 500 characters").optional(),
    applicationForm: applicationFormSchema.optional(),
    skillTagIds: z
      .array(z.string().uuid("Invalid skill tag ID"))
      .min(1, "At least one skill tag is required")
      .max(10, "Cannot add more than 10 skill tags")
      .optional(),
  })
  .strict();

const applyToTeamSchema = z
  .object({
    message: z.string().trim().max(1000, "Message must be at most 1000 characters").optional(),
    responses: z
      .record(z.string(), z.string().trim().max(5000, "Response must be at most 5000 characters"))
      .optional(),
  })
  .strict();

const reviewApplicationSchema = z
  .object({
    status: z.enum(["ACCEPTED", "REJECTED"]),
  })
  .strict();

const listTeamRequestsQuerySchema = z.object({
  status: z.enum(["OPEN", "FILLED", "CLOSED"]).optional(),
  category: z.string().trim().optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
  meetingPreference: z.enum(["ONLINE", "IN_PERSON", "HYBRID", "FLEXIBLE"]).optional(),
  skill: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sort: z.enum(["newest", "deadline", "applications"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  excludeOwn: z.coerce.boolean().optional(),
  bookmarked: z.coerce.boolean().optional(),
});

export const teamValidation = {
  createTeamRequestSchema,
  updateTeamRequestSchema,
  applyToTeamSchema,
  reviewApplicationSchema,
  listTeamRequestsQuerySchema,
};
