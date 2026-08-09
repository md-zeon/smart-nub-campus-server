import { z } from "zod";

const DEPARTMENT_ENUM = [
  "CSE",
  "ECSE",
  "EEE",
  "EEEE",
  "BBA",
  "MBA",
  "ENGLISH",
  "MAE",
  "BANGLA",
  "MAB",
  "LLB",
  "MPH",
  "BPH",
  "ME",
  "CIVIL",
  "BTX",
  "EBTX",
] as const;

const listDirectorySchema = z
  .object({
    department: z.enum(DEPARTMENT_ENUM).optional(),
    graduationYear: z.coerce.number().int().min(2000).max(2100).optional(),
    industry: z.string().trim().max(100).optional(),
    location: z.string().trim().max(100).optional(),
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

export const alumniValidation = {
  listDirectorySchema,
};
