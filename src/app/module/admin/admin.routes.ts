import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import requireRole from "../../middleware/requireRole";
import validateRequest from "../../middleware/validateRequest";
import { adminController } from "./admin.controller";
import { adminValidation } from "./admin.validation";
import { UserRole } from "../../../generated/prisma/enums";

const router: Router = Router();

// All admin routes require session verification and ADMIN role
router.use(verifySession);
router.use(requireRole(UserRole.ADMIN));

// --- Dashboard Stats ---
router.get("/stats", adminController.getDashboardStats);

// --- User Management ---
router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserById);
router.patch(
  "/users/:id/status",
  validateRequest(adminValidation.updateUserStatusSchema),
  adminController.updateUserStatus,
);
router.delete("/users/:id", adminController.deleteUser);

// --- Resource Management ---
router.get("/resources", adminController.listResources);
router.patch(
  "/resources/:id/verify",
  validateRequest(adminValidation.verifyResourceSchema),
  adminController.verifyResource,
);
router.delete("/resources/:id", adminController.deleteResource);

// --- Course Management ---
router.get("/courses", adminController.listCourses);
router.get("/courses/:id", adminController.getCourseById);
router.post(
  "/courses",
  validateRequest(adminValidation.createCourseSchema),
  adminController.createCourse,
);
router.patch(
  "/courses/:id",
  validateRequest(adminValidation.updateCourseSchema),
  adminController.updateCourse,
);
router.delete("/courses/:id", adminController.deleteCourse);

// --- Resource Category Management ---
router.get("/resource-categories", adminController.listResourceCategories);
router.get("/resource-categories/:id", adminController.getResourceCategoryById);
router.post(
  "/resource-categories",
  validateRequest(adminValidation.createResourceCategorySchema),
  adminController.createResourceCategory,
);
router.patch(
  "/resource-categories/:id",
  validateRequest(adminValidation.updateResourceCategorySchema),
  adminController.updateResourceCategory,
);
router.delete("/resource-categories/:id", adminController.deleteResourceCategory);

// --- Discussion Category Management ---
router.get("/discussion-categories", adminController.listDiscussionCategories);
router.get("/discussion-categories/:id", adminController.getDiscussionCategoryById);
router.post(
  "/discussion-categories",
  validateRequest(adminValidation.createDiscussionCategorySchema),
  adminController.createDiscussionCategory,
);
router.patch(
  "/discussion-categories/:id",
  validateRequest(adminValidation.updateDiscussionCategorySchema),
  adminController.updateDiscussionCategory,
);
router.delete("/discussion-categories/:id", adminController.deleteDiscussionCategory);

// --- Question Category Management ---
router.get("/question-categories", adminController.listQuestionCategories);
router.get("/question-categories/:id", adminController.getQuestionCategoryById);
router.post(
  "/question-categories",
  validateRequest(adminValidation.createQuestionCategorySchema),
  adminController.createQuestionCategory,
);
router.patch(
  "/question-categories/:id",
  validateRequest(adminValidation.updateQuestionCategorySchema),
  adminController.updateQuestionCategory,
);
router.delete("/question-categories/:id", adminController.deleteQuestionCategory);

// --- Event Management ---
router.get("/events", adminController.listEvents);
router.get("/events/:id", adminController.getEventById);
router.post(
  "/events",
  validateRequest(adminValidation.createEventSchema),
  adminController.createEvent,
);
router.patch(
  "/events/:id",
  validateRequest(adminValidation.updateEventSchema),
  adminController.updateEvent,
);
router.delete("/events/:id", adminController.deleteEvent);

// --- Audit Log ---
router.get("/audit-log", adminController.listAuditLogs);
router.get("/audit-log/:id", adminController.getAuditLogById);

export { router as adminRoutes };
