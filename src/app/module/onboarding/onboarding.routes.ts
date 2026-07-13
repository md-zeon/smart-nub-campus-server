import { Router } from "express";
import { onboardingController } from "./onboarding.controller";

const router: Router = Router();

router.get("/current", onboardingController.getCurrentStep);
router.post("/complete", onboardingController.completeOnboarding);

export const onboardingRoutes = router;
