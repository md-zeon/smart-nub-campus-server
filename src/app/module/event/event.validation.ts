import { z } from "zod";

const createEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    description: z.string().trim().optional(),
    eventDate: z.string().datetime("Invalid event date format"),
    location: z
      .string()
      .trim()
      .max(200, "Location must be at most 200 characters")
      .optional(),
    imageUrl: z.string().url("Invalid image URL").optional(),
    organizerId: z.string().uuid("Invalid organizer ID").optional(),
    status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
    isFeatured: z.boolean().optional(),
  })
  .strict();

const updateEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    description: z.string().trim().optional(),
    eventDate: z.string().datetime("Invalid event date format").optional(),
    location: z
      .string()
      .trim()
      .max(200, "Location must be at most 200 characters")
      .optional(),
    imageUrl: z.string().url("Invalid image URL").optional().nullable(),
    status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
    isFeatured: z.boolean().optional(),
  })
  .strict();

const listEventsSchema = z.object({
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
  search: z.string().optional(),
  upcoming: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  featured: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val) || 12)
    .optional(),
});

export const eventValidation = {
  createEventSchema,
  updateEventSchema,
  listEventsSchema,
};
