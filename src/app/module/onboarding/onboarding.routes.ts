import { Router } from "express";
import { onboardingController } from "./onboarding.controller";
import verifySessionForOnboarding from "../../middleware/verifySessionForOnboarding";
import validateRequest from "../../middleware/validateRequest";
import { onboardingRateLimiter } from "../../middleware/rateLimit";
import { completeOnboardingSchema } from "./onboarding.validation";

const router: Router = Router();

router.get("/current", onboardingRateLimiter, onboardingController.getCurrentStep);
router.post(
  "/complete",
  onboardingRateLimiter,
  verifySessionForOnboarding,
  validateRequest(completeOnboardingSchema),
  onboardingController.completeOnboarding,
);

export const onboardingRoutes = router;
