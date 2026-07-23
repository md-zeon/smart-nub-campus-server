import { z } from "zod";

const profileVisibilityEnum = z.enum([
  "EVERYONE",
  "STUDENTS_ONLY",
  "CONNECTIONS_ONLY",
  "ONLY_ME",
]);

const connectionRequestPolicyEnum = z.enum([
  "EVERYONE",
  "SAME_DEPARTMENT",
  "SAME_BATCH",
  "MUTUAL_CONNECTIONS",
  "NOBODY",
]);

const messagingPolicyEnum = z.enum([
  "EVERYONE",
  "CONNECTIONS",
  "DEPARTMENT",
  "NOBODY",
]);

const updatePrivacySettingsSchema = z
  .object({
    showProfile: profileVisibilityEnum.optional(),
    showAcademicInfo: profileVisibilityEnum.optional(),
    showSkills: profileVisibilityEnum.optional(),
    showProjects: profileVisibilityEnum.optional(),
    showReputation: profileVisibilityEnum.optional(),
    showBadges: profileVisibilityEnum.optional(),
    showSocialLinks: profileVisibilityEnum.optional(),
    connectionRequestPolicy: connectionRequestPolicyEnum.optional(),
    messagingPolicy: messagingPolicyEnum.optional(),
    allowMessageRequests: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional(),
    showLastActive: z.boolean().optional(),
    readReceipts: z.boolean().optional(),
    searchableProfile: z.boolean().optional(),
    appearInRecommendations: z.boolean().optional(),
  })
  .strict();

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

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const requestExportSchema = z
  .object({
    type: z.enum(["JSON", "CSV", "PDF"], {
      message: "Export type must be JSON, CSV, or PDF",
    }),
  })
  .strict();

const requestArchiveSchema = z
  .object({
    password: z.string().min(1, "Password is required"),
  })
  .strict();

const requestDeletionSchema = z
  .object({
    password: z.string().min(1, "Password is required"),
    reason: z.string().max(500).optional(),
  })
  .strict();

export const settingsValidation = {
  updatePrivacySettingsSchema,
  updateNotificationSettingsSchema,
  changePasswordSchema,
  requestExportSchema,
  requestArchiveSchema,
  requestDeletionSchema,
};
