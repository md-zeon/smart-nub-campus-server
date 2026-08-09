import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import { courseController } from "./course.controller";

const router: Router = Router();

router.get("/:id", verifySession, courseController.getCourse);

export const courseRoutes = router;
