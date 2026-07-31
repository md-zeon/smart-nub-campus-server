import { z } from "zod";

const updateProfileSchema = z
  .object({
    bio: z.string().trim().max(500).optional(),
    image: z.string().url().optional(),
    coverImage: z.string().url().optional(),
    githubUrl: z.string().url().optional(),
    linkedinUrl: z.string().url().optional(),
    portfolioUrl: z.string().url().optional(),
    websiteUrl: z.string().url().optional(),
    location: z.string().trim().max(100).optional(),
    phoneNumber: z.string().trim().max(20).optional(),
    currentSemester: z.number().int().min(1).max(12).optional(),
    batchYear: z.number().int().min(2000).max(2030).optional(),
    // Career profile (Alumni role feature)
    currentEmployer: z.string().trim().max(200).optional(),
    jobTitle: z.string().trim().max(200).optional(),
    industry: z.string().trim().max(100).optional(),
    showInAlumniDirectory: z.boolean().optional(),
    isMentor: z.boolean().optional(),
    mentorshipTopics: z
      .array(z.string().trim().min(1).max(100))
      .max(10)
      .optional(),
  })
  .strict();

const employmentBaseSchema = {
  employer: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  industry: z.string().trim().max(100).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullish(),
  isCurrent: z.boolean().default(false),
  description: z.string().trim().max(1000).optional(),
};

const createEmploymentSchema = z
  .object(employmentBaseSchema)
  .strict()
  .refine(
    (data) => !data.isCurrent || !data.endDate,
    {
      message: "endDate cannot be set when the role is current.",
      path: ["endDate"],
    },
  );

const updateEmploymentSchema = z
  .object({
    employer: z.string().trim().min(1).max(200).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    industry: z.string().trim().max(100).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullish(),
    isCurrent: z.boolean().optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (data) => !data.isCurrent || !data.endDate,
    {
      message: "endDate cannot be set when the role is current.",
      path: ["endDate"],
    },
  );

export const identityValidation = {
  updateProfileSchema,
  createEmploymentSchema,
  updateEmploymentSchema,
};
