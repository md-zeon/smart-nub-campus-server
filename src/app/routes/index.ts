import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { accountRoutes } from "../module/account/account.routes";
import { authRoutes } from "../module/auth/auth.routes";
import { onboardingRoutes } from "../module/onboarding/onboarding.routes";
import { verificationRoutes } from "../module/verification/verification.routes";
import { auth } from "../lib/auth";

const router: Router = Router();

// Custom auth routes registered first to take precedence
// Our routes: /login, /logout, /me
router.use("/auth", authRoutes);

// Mount Better Auth handler after custom routes to expose OTP endpoints
// This enables: /email-otp/send-verification-otp, /email-otp/verify-email, etc.
router.use("/auth", toNodeHandler(auth));

router.use("/onboarding", onboardingRoutes);
router.use("/verification", verificationRoutes);
router.use("/account", accountRoutes);

export const IndexRoutes = router;
