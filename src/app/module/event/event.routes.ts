import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import requireRole from "../../middleware/requireRole";
import validateRequest from "../../middleware/validateRequest";
import { eventController } from "./event.controller";
import { eventValidation } from "./event.validation";
import { UserRole } from "../../../generated/prisma/enums";

const router: Router = Router();

// Upcoming events for homepage (must be before /:id to avoid route conflict)
router.get("/upcoming", verifySession, eventController.getUpcomingEvents);

// List all events with filters
router.get("/", verifySession, eventController.listEvents);

// Admin-only: create event
router.post(
  "/",
  verifySession,
  requireRole(UserRole.ADMIN),
  validateRequest(eventValidation.createEventSchema),
  eventController.createEvent,
);

// Get single event
router.get("/:id", verifySession, eventController.getEventById);

// Admin-only: update event
router.patch(
  "/:id",
  verifySession,
  requireRole(UserRole.ADMIN),
  validateRequest(eventValidation.updateEventSchema),
  eventController.updateEvent,
);

// Admin-only: delete event
router.delete(
  "/:id",
  verifySession,
  requireRole(UserRole.ADMIN),
  eventController.deleteEvent,
);

// Toggle RSVP (any authenticated user)
router.post("/:id/rsvp", verifySession, eventController.toggleRsvp);

export const eventRoutes = router;
