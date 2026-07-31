import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import requireRole from "../../middleware/requireRole";
import validateRequest from "../../middleware/validateRequest";
import { UserRole } from "../../../generated/prisma/enums";
import { mentorshipController } from "./mentorship.controller";
import { mentorshipValidation } from "./mentorship.validation";

const router: Router = Router();

router.get(
  "/mentors",
  verifySession,
  validateRequest(mentorshipValidation.listMentorsSchema, "query"),
  mentorshipController.listMentors,
);

// Request mentorship — students only
router.post(
  "/requests",
  verifySession,
  requireRole(UserRole.STUDENT),
  validateRequest(mentorshipValidation.createMentorshipRequestSchema),
  mentorshipController.createMentorshipRequest,
);

router.get(
  "/requests",
  verifySession,
  validateRequest(mentorshipValidation.listRequestsSchema, "query"),
  mentorshipController.listRequests,
);

router.patch(
  "/requests/:id",
  verifySession,
  validateRequest(mentorshipValidation.updateMentorshipRequestSchema),
  mentorshipController.updateMentorshipRequest,
);

export const mentorshipRoutes = router;
