import { z } from "zod";

const JOB_TYPE_ENUM = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "REMOTE",
] as const;

const JOB_STATUS_ENUM = ["OPEN", "FILLED", "CLOSED"] as const;

const JOB_SOURCE_ENUM = [
  "PLATFORM",
  "LINKEDIN",
  "FACEBOOK",
  "BDJOBS",
  "INDEED",
  "GLASSDOOR",
  "GOOGLE_JOBS",
  "BIKROY",
  "CHAKRI",
  "JOBSBD",
  "COMPANY_WEBSITE",
  "NEWSPAPER",
  "OTHER",
] as const;

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

const createJobSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    company: z.string().trim().min(1, "Company is required").max(200),
    description: z.string().trim().max(5000).optional(),
    employmentType: z.enum(JOB_TYPE_ENUM),
    location: z.string().trim().max(200).optional(),
    salaryRange: z.string().trim().max(100).optional(),
    applicationUrl: z.string().url("Invalid application URL").optional(),
    deadline: z.coerce.date().optional(),
    department: z.enum(DEPARTMENT_ENUM).optional(),
    source: z.enum(JOB_SOURCE_ENUM).optional(),
    sourceUrl: z
      .string()
      .trim()
      .url("Invalid source URL")
      .max(2048)
      .optional(),
  })
  .strict();

const updateJobSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    company: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    employmentType: z.enum(JOB_TYPE_ENUM).optional(),
    location: z.string().trim().max(200).optional().nullable(),
    salaryRange: z.string().trim().max(100).optional().nullable(),
    applicationUrl: z.string().url("Invalid application URL").optional().nullable(),
    deadline: z.coerce.date().optional().nullable(),
    department: z.enum(DEPARTMENT_ENUM).optional().nullable(),
    status: z.enum(JOB_STATUS_ENUM).optional(),
    source: z.enum(JOB_SOURCE_ENUM).optional(),
    sourceUrl: z
      .string()
      .trim()
      .url("Invalid source URL")
      .max(2048)
      .optional()
      .nullable(),
  })
  .strict();

const importJobSchema = z
  .object({
    input: z.string().trim().min(1, "Input is required").max(20000),
  })
  .strict();

const listJobsSchema = z
  .object({
    company: z.string().trim().max(100).optional(),
    location: z.string().trim().max(100).optional(),
    employmentType: z.enum(JOB_TYPE_ENUM).optional(),
    department: z.enum(DEPARTMENT_ENUM).optional(),
    status: z.enum(JOB_STATUS_ENUM).optional(),
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const applyJobSchema = z
  .object({
    coverLetter: z.string().trim().max(2000).optional(),
    resumeUrl: z.string().url("Invalid resume URL").optional(),
  })
  .strict();

const updateApplicationSchema = z
  .object({
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"]),
  })
  .strict();

export const jobsValidation = {
  createJobSchema,
  updateJobSchema,
  listJobsSchema,
  applyJobSchema,
  updateApplicationSchema,
  importJobSchema,
};
