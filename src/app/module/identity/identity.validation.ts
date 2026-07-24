import { z } from "zod";

const updateProfileSchema = z
  .object({
    bio: z.string().trim().max(500).optional(),
    coverImage: z.string().url().optional(),
    githubUrl: z.string().url().optional(),
    linkedinUrl: z.string().url().optional(),
    portfolioUrl: z.string().url().optional(),
    websiteUrl: z.string().url().optional(),
    location: z.string().trim().max(100).optional(),
    phoneNumber: z.string().trim().max(20).optional(),
    currentSemester: z.number().int().min(1).max(16).optional(),
    batchYear: z.number().int().min(2000).max(2030).optional(),
  })
  .strict();

export const identityValidation = {
  updateProfileSchema,
};
