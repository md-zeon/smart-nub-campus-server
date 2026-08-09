import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import { activityController } from "./activity.controller";

const router: Router = Router();

// Campus-wide activity feed
router.get("/", verifySession, activityController.listActivities);

export const activityRoutes = router;
