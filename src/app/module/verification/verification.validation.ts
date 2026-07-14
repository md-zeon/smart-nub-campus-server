import { z } from "zod";
import { VerificationStatus } from "../../../generated/prisma/enums";

const createVerificationRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name is too long"),

  email: z.string().toLowerCase().trim().email("Invalid email address"),

  dateOfBirth: z.coerce
    .date()
    .max(new Date(), "Date of birth cannot be in the future"),

  // Example: 41230301652
  studentId: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "Student ID must be exactly 11 digits"),

  idCardImage: z.url("Invalid ID card image URL"),

  idCardImagePublicId: z.string().optional(),
});

// Admin schemas
const listVerificationRequestsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(VerificationStatus).optional(),
  search: z.string().optional(),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const rejectVerificationRequestSchema = z.object({
  note: z.string().trim().min(1, "Rejection note is required"),
});

export const verificationValidation = {
  createVerificationRequestSchema,
  listVerificationRequestsSchema,
  rejectVerificationRequestSchema,
};
