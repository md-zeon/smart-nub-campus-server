import { z } from "zod";

const forgotPasswordSchema = z
  .object({
    identifier: z
      .string()
      .min(1, "Email or Student ID is required")
      .max(100, "Identifier is too long"),
  })
  .strict();

export const forgotPasswordValidation = {
  forgotPasswordSchema,
};
