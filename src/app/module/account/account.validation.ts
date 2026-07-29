import { z } from "zod";
import { Gender } from "../../../generated/prisma/enums";

const createAccountSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/\d/, "Password must contain at least one number"),
    gender: z.nativeEnum(Gender),
    image: z.string().url().optional().or(z.literal("")),
    imagePublicId: z.string().optional().or(z.literal("")),
  })
  .strict();

export const accountValidation = {
  createAccountSchema,
};
