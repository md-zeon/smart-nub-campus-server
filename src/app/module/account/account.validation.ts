import { z } from "zod";

const createAccountSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
  })
  .strict();

export const accountValidation = {
  createAccountSchema,
};
