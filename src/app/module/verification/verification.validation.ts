import { z } from "zod";

const createVerificationRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name is too long"),

  email: z.email("Invalid email address").toLowerCase().trim(),

  dateOfBirth: z.coerce
    .date()
    .max(new Date(), "Date of birth cannot be in the future"),

  // Example: 41230301652
  studentId: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "Student ID must be exactly 11 digits"),

  idCardImage: z.url("Invalid ID card image URL"),
});

export const verificationValidation = {
  createVerificationRequestSchema,
};
