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

// ── Relationships ────────────────────────────────────────────────────────────
// Both participants of an accepted mentorship can access these routes.

router.get(
  "/relationships",
  verifySession,
  validateRequest(mentorshipValidation.listMentorshipsSchema, "query"),
  mentorshipController.listMentorships,
);

router.get(
  "/relationships/:id",
  verifySession,
  validateRequest(mentorshipValidation.paramsIdSchema, "params"),
  mentorshipController.getMentorship,
);

router.get(
  "/relationships/:id/messages",
  verifySession,
  validateRequest(mentorshipValidation.paramsIdSchema, "params"),
  validateRequest(mentorshipValidation.messagesQuerySchema, "query"),
  mentorshipController.listMessages,
);

router.post(
  "/relationships/:id/messages",
  verifySession,
  validateRequest(mentorshipValidation.paramsIdSchema, "params"),
  validateRequest(mentorshipValidation.sendMessageSchema),
  mentorshipController.sendMessage,
);

router.post(
  "/relationships/:id/goals",
  verifySession,
  validateRequest(mentorshipValidation.paramsIdSchema, "params"),
  validateRequest(mentorshipValidation.createMentorshipGoalSchema),
  mentorshipController.createGoal,
);

router.patch(
  "/goals/:goalId",
  verifySession,
  validateRequest(mentorshipValidation.goalIdSchema, "params"),
  validateRequest(mentorshipValidation.updateMentorshipGoalSchema),
  mentorshipController.updateGoal,
);

router.delete(
  "/goals/:goalId",
  verifySession,
  validateRequest(mentorshipValidation.goalIdSchema, "params"),
  mentorshipController.deleteGoal,
);

router.post(
  "/relationships/:id/sessions",
  verifySession,
  validateRequest(mentorshipValidation.paramsIdSchema, "params"),
  validateRequest(mentorshipValidation.createMentorshipSessionSchema),
  mentorshipController.createSession,
);

router.patch(
  "/sessions/:sessionId",
  verifySession,
  validateRequest(mentorshipValidation.sessionIdSchema, "params"),
  validateRequest(mentorshipValidation.updateMentorshipSessionSchema),
  mentorshipController.updateSession,
);

router.post(
  "/relationships/:id/complete",
  verifySession,
  validateRequest(mentorshipValidation.paramsIdSchema, "params"),
  validateRequest(mentorshipValidation.completeMentorshipSchema),
  mentorshipController.completeMentorship,
);

router.post(
  "/relationships/:id/rate",
  verifySession,
  validateRequest(mentorshipValidation.paramsIdSchema, "params"),
  validateRequest(mentorshipValidation.rateMentorSchema),
  mentorshipController.rateMentor,
);

router.post(
  "/relationships/:id/end",
  verifySession,
  validateRequest(mentorshipValidation.paramsIdSchema, "params"),
  mentorshipController.endMentorship,
);

export const mentorshipRoutes = router;
