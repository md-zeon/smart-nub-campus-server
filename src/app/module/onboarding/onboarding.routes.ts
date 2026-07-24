import { Router } from "express";
import { onboardingController } from "./onboarding.controller";
import validateRequest from "../../middleware/validateRequest";
import { onboardingRateLimiter } from "../../middleware/rateLimit";
import { completeOnboardingSchema } from "./onboarding.validation";

const router: Router = Router();

router.get("/current", onboardingRateLimiter, onboardingController.getCurrentStep);
router.post(
  "/complete",
  onboardingRateLimiter,
  validateRequest(completeOnboardingSchema),
  onboardingController.completeOnboarding,
);

export const onboardingRoutes = router;
