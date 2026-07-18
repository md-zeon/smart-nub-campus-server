import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import requireRole from "../../middleware/requireRole";
import validateRequest from "../../middleware/validateRequest";
import { gamificationController } from "./gamification.controller";
import { gamificationValidation } from "./gamification.validation";
import { UserRole } from "../../../generated/prisma/enums";

const router: Router = Router();

// Leaderboard (any authenticated user)
router.get("/leaderboard", verifySession, gamificationController.getLeaderboard);

// My points summary
router.get("/points/me", verifySession, gamificationController.getMyPoints);

// My reputation history
router.get("/history/me", verifySession, gamificationController.getMyReputationHistory);

// My badges
router.get("/badges/me", verifySession, gamificationController.getMyBadges);

// Get points for a specific user
router.get("/points/:userId", verifySession, gamificationController.getUserPoints);

// Get reputation history for a specific user
router.get("/history/:userId", verifySession, gamificationController.getReputationHistory);

// Handle upvote (internal — called by other modules)
router.post(
  "/vote/up",
  verifySession,
  validateRequest(gamificationValidation.handleVoteSchema),
  gamificationController.handleUpvote,
);

// Handle downvote (internal — called by other modules)
router.post(
  "/vote/down",
  verifySession,
  validateRequest(gamificationValidation.handleVoteSchema),
  gamificationController.handleDownvote,
);

// Handle vote reversal (internal — called by other modules)
router.post(
  "/vote/reverse",
  verifySession,
  validateRequest(gamificationValidation.handleVoteSchema),
  gamificationController.handleVoteReversal,
);

// Admin-only: manual point adjustment
router.post(
  "/admin/adjust",
  verifySession,
  requireRole(UserRole.ADMIN),
  validateRequest(gamificationValidation.adminAdjustPointsSchema),
  gamificationController.adminAdjustPoints,
);

// Admin-only: award points
router.post(
  "/admin/award",
  verifySession,
  requireRole(UserRole.ADMIN),
  validateRequest(gamificationValidation.awardPointsSchema),
  gamificationController.awardPoints,
);

export const gamificationRoutes = router;
