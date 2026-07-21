import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
import { connectionController } from "./connection.controller";
import { connectionValidation } from "./connection.validation";

const router: Router = Router();

// All connection routes require authentication
router.use(verifySession);

// Search people
router.get("/search", connectionController.searchPeople);

// Get suggested people (People You May Know)
router.get("/suggestions", connectionController.getSuggestedPeople);

// Get blocked users
router.get("/blocked", connectionController.getBlockedUsers);

// Get pending incoming requests
router.get("/pending", connectionController.getPendingRequests);

// Get sent outgoing requests
router.get("/sent", connectionController.getSentRequests);

// Get my connections
router.get("/", connectionController.getMyConnections);

// Send connection request
router.post(
  "/request",
  validateRequest(connectionValidation.sendConnectionRequestSchema),
  connectionController.sendConnectionRequest,
);

// Accept a connection request
router.put("/:id/accept", connectionController.acceptConnection);

// Reject a connection request
router.put("/:id/reject", connectionController.rejectConnection);

// Toggle favorite on a connection
router.put("/:id/favorite", connectionController.toggleFavorite);

// Remove an accepted connection
router.delete("/:id", connectionController.removeConnection);

// Block a user
router.post(
  "/block",
  validateRequest(connectionValidation.blockUserSchema),
  connectionController.blockUser,
);

// Unblock a user
router.delete("/block/:blockedId", connectionController.unblockUser);

// Get user skills
router.get("/skills/:userId", connectionController.getUserSkills);

// Add a skill
router.post(
  "/skills",
  validateRequest(connectionValidation.addSkillSchema),
  connectionController.addSkill,
);

// Remove a skill
router.delete("/skills/:skillId", connectionController.removeSkill);

export const connectionRoutes = router;
