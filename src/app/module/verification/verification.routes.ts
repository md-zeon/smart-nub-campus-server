import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import verifySession from "../../middleware/verifySession";
import requireRole from "../../middleware/requireRole";
import { verificationRateLimiter } from "../../middleware/rateLimit";
import { UserRole } from "../../../generated/prisma/enums";
import { verificationController } from "./verification.controller";
import { verificationValidation } from "./verification.validation";

const router: Router = Router();

// Public endpoint
router.post(
  "/request",
  verificationRateLimiter,
  validateRequest(verificationValidation.createVerificationRequestSchema),
  verificationController.createVerificationRequest,
);

// Admin endpoints
router.get(
  "/",
  verifySession,
  requireRole(UserRole.ADMIN),
  verificationController.listVerificationRequests,
);

router.get(
  "/:id",
  verifySession,
  requireRole(UserRole.ADMIN),
  verificationController.getVerificationRequest,
);

router.patch(
  "/:id/approve",
  verifySession,
  requireRole(UserRole.ADMIN),
  verificationController.approveVerificationRequest,
);

router.patch(
  "/:id/reject",
  verifySession,
  requireRole(UserRole.ADMIN),
  validateRequest(verificationValidation.rejectVerificationRequestSchema),
  verificationController.rejectVerificationRequest,
);

export const verificationRoutes = router;
