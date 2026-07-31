import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import requireRole from "../../middleware/requireRole";
import validateRequest from "../../middleware/validateRequest";
import { UserRole } from "../../../generated/prisma/enums";
import { jobsController } from "./jobs.controller";
import { jobsValidation } from "./jobs.validation";

const router: Router = Router();

router.get(
  "/",
  verifySession,
  validateRequest(jobsValidation.listJobsSchema, "query"),
  jobsController.listJobs,
);

// Post a job — alumni and admins only
router.post(
  "/",
  verifySession,
  requireRole(UserRole.ALUMNI, UserRole.ADMIN),
  validateRequest(jobsValidation.createJobSchema),
  jobsController.createJob,
);

router.get("/:id", verifySession, jobsController.getJobById);

// Owner or admin can update/delete
router.patch(
  "/:id",
  verifySession,
  validateRequest(jobsValidation.updateJobSchema),
  jobsController.updateJob,
);
router.delete("/:id", verifySession, jobsController.deleteJob);

// Apply to a job (any authenticated user)
router.post(
  "/:id/apply",
  verifySession,
  validateRequest(jobsValidation.applyJobSchema),
  jobsController.applyToJob,
);

// Applications — owner or admin only
router.get("/:id/applications", verifySession, jobsController.listApplications);
router.patch(
  "/:id/applications/:appId",
  verifySession,
  validateRequest(jobsValidation.updateApplicationSchema),
  jobsController.updateApplicationStatus,
);

export const jobsRoutes = router;
