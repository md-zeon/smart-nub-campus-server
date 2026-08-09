import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import requireRole from "../../middleware/requireRole";
import validateRequest from "../../middleware/validateRequest";
import { UserRole } from "../../../generated/prisma/enums";
import { alumniController } from "./alumni.controller";
import { alumniValidation } from "./alumni.validation";

const router: Router = Router();

router.get(
  "/transition-status",
  verifySession,
  requireRole(UserRole.STUDENT),
  alumniController.getTransitionStatus,
);

router.post(
  "/transition",
  verifySession,
  requireRole(UserRole.STUDENT),
  alumniController.transitionToAlumni,
);

// Alumni directory (visible to all authenticated users)
router.get(
  "/directory",
  verifySession,
  validateRequest(alumniValidation.listDirectorySchema, "query"),
  alumniController.listDirectory,
);

router.get(
  "/directory/stats",
  verifySession,
  alumniController.getDirectoryStats,
);

router.get(
  "/directory/:id",
  verifySession,
  alumniController.getDirectoryMember,
);

export const alumniRoutes = router;
