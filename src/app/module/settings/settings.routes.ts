import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
import { settingsController } from "./settings.controller";
import { settingsValidation } from "./settings.validation";

const router: Router = Router();

// All settings routes require authentication
router.use(verifySession);

// ── Privacy Settings ──────────────────────────────────────────────────────
router.get("/privacy", settingsController.getPrivacySettings);
router.patch(
  "/privacy",
  validateRequest(settingsValidation.updatePrivacySettingsSchema),
  settingsController.updatePrivacySettings,
);

// ── Notification Settings ─────────────────────────────────────────────────
router.get("/notifications", settingsController.getNotificationSettings);
router.patch(
  "/notifications",
  validateRequest(settingsValidation.updateNotificationSettingsSchema),
  settingsController.updateNotificationSettings,
);

// ── Security ──────────────────────────────────────────────────────────────
router.post(
  "/security/change-password",
  validateRequest(settingsValidation.changePasswordSchema),
  settingsController.changePassword,
);
router.get("/security/sessions", settingsController.getActiveSessions);
router.delete(
  "/security/sessions/:sessionId",
  settingsController.terminateSession,
);
router.post(
  "/security/sessions/terminate-others",
  settingsController.terminateOtherSessions,
);
router.get("/security/login-history", settingsController.getLoginHistory);

// ── Account Management ────────────────────────────────────────────────────
router.post(
  "/account/export",
  validateRequest(settingsValidation.requestExportSchema),
  settingsController.requestExport,
);
router.get("/account/export/:jobId", settingsController.getExportStatus);
router.get(
  "/account/export/:jobId/download",
  settingsController.downloadExport,
);
router.post(
  "/account/archive",
  validateRequest(settingsValidation.requestArchiveSchema),
  settingsController.requestArchive,
);
router.post("/account/deactivate", settingsController.deactivateAccount);
router.post("/account/reactivate", settingsController.reactivateAccount);
router.post(
  "/account/delete",
  validateRequest(settingsValidation.requestDeletionSchema),
  settingsController.requestDeletion,
);
router.post("/account/delete/cancel", settingsController.cancelDeletion);

export const settingsRoutes = router;
