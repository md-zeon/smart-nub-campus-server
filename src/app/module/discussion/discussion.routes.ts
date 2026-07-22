import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import requireRole from "../../middleware/requireRole";
import validateRequest from "../../middleware/validateRequest";
import { discussionController } from "./discussion.controller";
import { discussionValidation } from "./discussion.validation";
import { UserRole } from "../../../generated/prisma/enums";

const router: Router = Router();

// Create a discussion
router.post(
  "/",
  verifySession,
  validateRequest(discussionValidation.createDiscussionSchema),
  discussionController.createDiscussion,
);

// List all discussions
router.get("/", verifySession, discussionController.listDiscussions);

// Get bookmarked discussions (must be before :id routes)
router.get("/bookmarks", verifySession, discussionController.getBookmarkedDiscussions);

// Get the current user's discussions (must be before :id routes)
router.get("/me", verifySession, discussionController.getMyDiscussions);

// Get discussions the current user replied to (must be before :id routes)
router.get("/replies/mine", verifySession, discussionController.getMyReplies);

// List discussion categories
router.get("/categories", verifySession, discussionController.listCategories);

// List discussion tags
router.get("/tags", verifySession, discussionController.listTags);

// Trending discussions
router.get("/trending", verifySession, discussionController.getTrending);

// Top contributors
router.get("/contributors", verifySession, discussionController.getTopContributors);

// Vote on a reply (must be before :id routes)
router.post(
  "/replies/:replyId/vote",
  verifySession,
  validateRequest(discussionValidation.voteSchema),
  discussionController.voteReply,
);

// List replies for a discussion
router.get("/:id/replies", verifySession, discussionController.listReplies);

// Get a single discussion
router.get("/:id", verifySession, discussionController.getDiscussion);

// Update a discussion
router.put(
  "/:id",
  verifySession,
  validateRequest(discussionValidation.updateDiscussionSchema),
  discussionController.updateDiscussion,
);

// Delete a discussion (soft delete)
router.delete("/:id", verifySession, discussionController.deleteDiscussion);

// Create a reply on a discussion
router.post(
  "/:id/replies",
  verifySession,
  validateRequest(discussionValidation.createReplySchema),
  discussionController.createReply,
);

// Delete a reply
router.delete("/:id/replies/:replyId", verifySession, discussionController.deleteReply);

// Vote on a discussion
router.post(
  "/:id/vote",
  verifySession,
  validateRequest(discussionValidation.voteSchema),
  discussionController.voteDiscussion,
);

// Bookmark/unbookmark a discussion
router.post("/:id/bookmark", verifySession, discussionController.bookmarkDiscussion);

// Pin/unpin a discussion (admin)
router.put("/:id/pin", verifySession, requireRole(UserRole.ADMIN), discussionController.pinDiscussion);

// Lock/unlock a discussion (admin)
router.put("/:id/lock", verifySession, requireRole(UserRole.ADMIN), discussionController.lockDiscussion);

// Mark/unmark discussion as solved (author only)
router.put("/:id/solved", verifySession, discussionController.markSolved);

export const discussionRoutes = router;
