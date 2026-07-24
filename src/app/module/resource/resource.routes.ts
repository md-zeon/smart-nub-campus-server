import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import requireRole from "../../middleware/requireRole";
import validateRequest from "../../middleware/validateRequest";
import { resourceController } from "./resource.controller";
import { resourceValidation } from "./resource.validation";
import { UserRole } from "../../../generated/prisma/enums";

const router: Router = Router();

router.post(
  "/",
  verifySession,
  validateRequest(resourceValidation.createResourceSchema),
  resourceController.createResource,
);

router.get("/", verifySession, resourceController.listResources);

router.get("/categories", verifySession, resourceController.listCategories);

router.get("/courses", verifySession, resourceController.listCourses);

router.get("/tags", verifySession, resourceController.listTags);

router.get(
  "/admin/reports",
  verifySession,
  requireRole(UserRole.ADMIN),
  resourceController.getReports,
);

router.patch(
  "/admin/reports/:id",
  verifySession,
  requireRole(UserRole.ADMIN),
  validateRequest(resourceValidation.reviewReportSchema),
  resourceController.reviewReport,
);

router.delete("/comments/:id", verifySession, resourceController.deleteComment);

router.get("/:id", verifySession, resourceController.getResourceById);

router.patch(
  "/:id",
  verifySession,
  validateRequest(resourceValidation.updateResourceSchema),
  resourceController.updateResource,
);

router.delete("/:id", verifySession, resourceController.deleteResource);

router.post("/:id/upvote", verifySession, resourceController.toggleVote);

router.post("/:id/bookmark", verifySession, resourceController.toggleBookmark);

router.post("/:id/download", verifySession, resourceController.trackDownload);

router.get("/:id/comments", verifySession, resourceController.getComments);

router.post(
  "/:id/comments",
  verifySession,
  validateRequest(resourceValidation.createCommentSchema),
  resourceController.addComment,
);

router.post(
  "/:id/report",
  verifySession,
  validateRequest(resourceValidation.reportResourceSchema),
  resourceController.reportResource,
);

export const resourceRoutes = router;
