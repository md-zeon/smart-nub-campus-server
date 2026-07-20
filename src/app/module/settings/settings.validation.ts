import { z } from "zod";

// Password change validation
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password must be at most 128 characters"),
    confirmPassword: z
      .string()
      .min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Privacy settings update
const updatePrivacySettingsSchema = z
  .object({
    showProfile: z
      .enum(["EVERYONE", "STUDENTS_ONLY", "CONNECTIONS_ONLY", "ONLY_ME"])
      .optional(),
    showAcademicInfo: z
      .enum(["EVERYONE", "STUDENTS_ONLY", "CONNECTIONS_ONLY", "ONLY_ME"])
      .optional(),
    showSkills: z
      .enum(["EVERYONE", "STUDENTS_ONLY", "CONNECTIONS_ONLY", "ONLY_ME"])
      .optional(),
    showProjects: z
      .enum(["EVERYONE", "STUDENTS_ONLY", "CONNECTIONS_ONLY", "ONLY_ME"])
      .optional(),
    showReputation: z
      .enum(["EVERYONE", "STUDENTS_ONLY", "CONNECTIONS_ONLY", "ONLY_ME"])
      .optional(),
    showBadges: z
      .enum(["EVERYONE", "STUDENTS_ONLY", "CONNECTIONS_ONLY", "ONLY_ME"])
      .optional(),
    showSocialLinks: z
      .enum(["EVERYONE", "STUDENTS_ONLY", "CONNECTIONS_ONLY", "ONLY_ME"])
      .optional(),
    connectionRequestPolicy: z
      .enum(["EVERYONE", "SAME_DEPARTMENT", "SAME_BATCH", "MUTUAL_CONNECTIONS", "NOBODY"])
      .optional(),
    messagingPolicy: z
      .enum(["EVERYONE", "CONNECTIONS", "DEPARTMENT", "NOBODY"])
      .optional(),
    allowMessageRequests: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional(),
    showLastActive: z.boolean().optional(),
    readReceipts: z.boolean().optional(),
    searchableProfile: z.boolean().optional(),
    appearInRecommendations: z.boolean().optional(),
  })
  .strict();

// Notification settings update
const updateNotificationSettingsSchema = z
  .object({
    resourcesInApp: z.boolean().optional(),
    resourcesEmail: z.boolean().optional(),
    discussionsInApp: z.boolean().optional(),
    discussionsEmail: z.boolean().optional(),
    qaInApp: z.boolean().optional(),
    qaEmail: z.boolean().optional(),
    messagingInApp: z.boolean().optional(),
    messagingEmail: z.boolean().optional(),
    networkInApp: z.boolean().optional(),
    networkEmail: z.boolean().optional(),
    teamsInApp: z.boolean().optional(),
    teamsEmail: z.boolean().optional(),
    adminInApp: z.boolean().optional(),
    adminEmail: z.boolean().optional(),
  })
  .strict();

// Data export request
const requestExportSchema = z
  .object({
    type: z.enum(["JSON", "CSV", "PDF"], {
      message: "Export type must be JSON, CSV, or PDF",
    }),
  })
  .strict();

// Archive request (password confirmation)
const requestArchiveSchema = z
  .object({
    password: z.string().min(1, "Password is required to confirm archive"),
  })
  .strict();

// Account deletion request
const requestDeletionSchema = z
  .object({
    password: z.string().min(1, "Password is required to confirm deletion"),
    reason: z.string().max(500, "Reason must be at most 500 characters").optional(),
  })
  .strict();

export const settingsValidation = {
  changePasswordSchema,
  updatePrivacySettingsSchema,
  updateNotificationSettingsSchema,
  requestExportSchema,
  requestArchiveSchema,
  requestDeletionSchema,
};
