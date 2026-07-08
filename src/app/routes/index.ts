import { Router } from "express";
import { onboardingRoutes } from "../module/onboarding/onboarding.routes";
import { verificationRoutes } from "../module/verification/verification.routes";

const router: Router = Router();

router.use("/onboarding", onboardingRoutes);
router.use("/verification", verificationRoutes);

export const IndexRoutes = router;
