import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { settingsController } from "./settings.controller";
import { settingsValidation } from "./settings.validation";

const router = Router();

// ─── Security Routes ─────────────────────────────────────────────

// Change password
router.post(
  "/security/change-password",
  validateRequest(settingsValidation.changePasswordSchema),
  settingsController.changePassword,
);

// Get active sessions
router.get("/security/sessions", settingsController.getActiveSessions);

// Terminate a specific session
router.delete("/security/sessions/:id", settingsController.terminateSession);

// Terminate all other sessions
router.post(
  "/security/sessions/terminate-others",
  settingsController.terminateOtherSessions,
);

// Get login history (paginated)
router.get("/security/login-history", settingsController.getLoginHistory);

// ─── Account Routes ──────────────────────────────────────────────

// Request data export
router.post(
  "/account/export",
  validateRequest(settingsValidation.requestExportSchema),
  settingsController.requestExport,
);

// Get export job status
router.get("/account/export/:jobId", settingsController.getExportStatus);

// Download completed export
router.get(
  "/account/export/:jobId/download",
  settingsController.downloadExport,
);

// Request full account archive
router.post(
  "/account/archive",
  validateRequest(settingsValidation.requestArchiveSchema),
  settingsController.requestArchive,
);

// Deactivate account
router.post(
  "/account/deactivate",
  validateRequest(settingsValidation.requestArchiveSchema),
  settingsController.deactivateAccount,
);

// Reactivate account
router.post(
  "/account/reactivate",
  validateRequest(settingsValidation.requestArchiveSchema),
  settingsController.reactivateAccount,
);

// Request account deletion (30-day grace period)
router.post(
  "/account/delete",
  validateRequest(settingsValidation.requestDeletionSchema),
  settingsController.requestDeletion,
);

// Cancel scheduled deletion
router.post("/account/delete/cancel", settingsController.cancelDeletion);

export { router as settingsRoutes };
