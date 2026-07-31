import { z } from "zod";

const listUsersSchema = z
  .object({
    search: z.string().optional(),
    role: z.enum(["STUDENT", "ADMIN", "ALUMNI"]).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const ADMISSION_SEMESTER_ENUM = ["SPRING", "SUMMER", "FALL"] as const;

const markGraduationSchema = z
  .object({
    graduationYear: z.number().int().min(2000).max(2100),
    graduationSemester: z.enum(ADMISSION_SEMESTER_ENUM),
    degreeTitle: z.string().trim().min(1).max(200).optional(),
    cgpa: z.number().min(0).max(4).optional(),
    graduationDate: z.coerce.date().optional(),
  })
  .strict();

const batchGraduationSchema = z
  .object({
    department: z.enum([
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
    ]).optional(),
    admissionYear: z.number().int().min(2000).max(2100).optional(),
    admissionSemester: z.enum(ADMISSION_SEMESTER_ENUM).optional(),
    graduationYear: z.number().int().min(2000).max(2100),
    graduationSemester: z.enum(ADMISSION_SEMESTER_ENUM),
  })
  .strict();

const listAlumniSchema = z
  .object({
    department: z.enum([
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
    ]).optional(),
    graduationYear: z.coerce.number().int().optional(),
    industry: z.string().trim().optional(),
    currentEmployer: z.string().trim().optional(),
    q: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const updateUserStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
  })
  .strict();

const listResourcesSchema = z
  .object({
    search: z.string().optional(),
    courseId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    isVerified: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const verifyResourceSchema = z
  .object({
    isVerified: z.boolean(),
  })
  .strict();

const listJobsSchema = z
  .object({
    search: z.string().optional(),
    status: z.enum(["OPEN", "FILLED", "CLOSED"]).optional(),
    isVerified: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

const verifyJobSchema = z
  .object({
    isVerified: z.boolean(),
  })
  .strict();

const createCourseSchema = z
  .object({
    code: z.string().trim().min(1, "Course code is required").max(20),
    name: z.string().trim().min(1, "Course name is required").max(200),
    department: z.enum([
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
    ]),
    semester: z.number().int().positive().optional(),
    description: z.string().trim().optional(),
  })
  .strict();

const updateCourseSchema = z
  .object({
    code: z.string().trim().min(1).max(20).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    department: z
      .enum([
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
      ])
      .optional(),
    semester: z.number().int().positive().optional(),
    description: z.string().trim().optional(),
  })
  .strict();

const createResourceCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Category name is required").max(100),
    icon: z.string().trim().optional(),
    description: z.string().trim().optional(),
  })
  .strict();

const updateResourceCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    icon: z.string().trim().optional(),
    description: z.string().trim().optional(),
  })
  .strict();

const createDiscussionCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Category name is required").max(100),
    icon: z.string().trim().optional(),
  })
  .strict();

const updateDiscussionCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    icon: z.string().trim().optional(),
  })
  .strict();

const createQuestionCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Category name is required").max(100),
    icon: z.string().trim().optional(),
  })
  .strict();

const updateQuestionCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    icon: z.string().trim().optional(),
  })
  .strict();

const listAuditLogsSchema = z
  .object({
    adminUserId: z.string().uuid().optional(),
    action: z.string().optional(),
    targetType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

export const adminValidation = {
  listUsersSchema,
  updateUserStatusSchema,
  listResourcesSchema,
  verifyResourceSchema,
  listJobsSchema,
  verifyJobSchema,
  createCourseSchema,
  updateCourseSchema,
  createResourceCategorySchema,
  updateResourceCategorySchema,
  createDiscussionCategorySchema,
  updateDiscussionCategorySchema,
  createQuestionCategorySchema,
  updateQuestionCategorySchema,
  listAuditLogsSchema,
  markGraduationSchema,
  batchGraduationSchema,
  listAlumniSchema,
};
