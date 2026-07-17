import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
import { teamController } from "./team.controller";
import { teamValidation } from "./team.validation";

const router: Router = Router();

// Create a team request
router.post(
  "/",
  verifySession,
  validateRequest(teamValidation.createTeamRequestSchema),
  teamController.createTeamRequest,
);

// List all team requests
router.get("/", verifySession, teamController.listTeamRequests);

// Withdraw own application (must be before :id routes)
router.delete(
  "/:id/applications/withdraw",
  verifySession,
  teamController.withdrawApplication,
);

// Remove a member from a team (must be before :id routes)
router.delete(
  "/:id/members/:memberId",
  verifySession,
  teamController.removeMember,
);

// Get team members
router.get("/:id/members", verifySession, teamController.getTeamMembers);

// Leave a team
router.post("/:id/leave", verifySession, teamController.leaveTeam);

// Apply to a team request
router.post(
  "/:id/apply",
  verifySession,
  validateRequest(teamValidation.applyToTeamSchema),
  teamController.applyToTeam,
);

// Review an application
router.put(
  "/:id/applications/:applicationId",
  verifySession,
  validateRequest(teamValidation.reviewApplicationSchema),
  teamController.reviewApplication,
);

// Get a single team request
router.get("/:id", verifySession, teamController.getTeamRequest);

// Update a team request
router.put(
  "/:id",
  verifySession,
  validateRequest(teamValidation.updateTeamRequestSchema),
  teamController.updateTeamRequest,
);

// Delete a team request (soft delete)
router.delete("/:id", verifySession, teamController.deleteTeamRequest);

export const teamRoutes = router;
