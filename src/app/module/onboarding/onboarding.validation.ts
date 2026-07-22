import { z } from "zod";

export const completeOnboardingSchema = z.object({
  body: z.object({
    email: z.string().email("A valid email address is required."),
  }),
});
