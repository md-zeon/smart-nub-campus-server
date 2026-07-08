import { Router } from "express";
import { accountRoutes } from "../module/account/account.routes";
import { onboardingRoutes } from "../module/onboarding/onboarding.routes";
import { verificationRoutes } from "../module/verification/verification.routes";

const router: Router = Router();

router.use("/onboarding", onboardingRoutes);
router.use("/verification", verificationRoutes);
router.use("/account", accountRoutes);

export const IndexRoutes = router;
