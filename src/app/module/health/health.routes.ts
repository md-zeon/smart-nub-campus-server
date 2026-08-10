import { Router } from "express";
import { healthController } from "./health.controller";

const router: Router = Router();

router.get("/", healthController.healthCheck);

export const healthRoutes = router;
