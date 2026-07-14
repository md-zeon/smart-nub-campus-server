import { z } from "zod";

const forgotPasswordSchema = z
  .object({
    identifier: z
      .string()
      .min(1, "Email or Student ID is required")
      .max(100, "Identifier is too long"),
  })
  .strict();

const resetPasswordSchema = z
  .object({
    identifier: z
      .string()
      .min(1, "Email or Student ID is required")
      .max(100, "Identifier is too long"),
    otp: z
      .string()
      .length(6, "OTP must be 6 digits")
      .regex(/^\d+$/, "OTP must contain only digits"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/\d/, "Password must contain at least one number"),
  })
  .strict();

export const authValidation = {
  forgotPasswordSchema,
  resetPasswordSchema,
};
