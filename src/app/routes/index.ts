import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { accountRoutes } from "../module/account/account.routes";
import { identityRoutes } from "../module/identity/identity.routes";
import { onboardingRoutes } from "../module/onboarding/onboarding.routes";
import { verificationRoutes } from "../module/verification/verification.routes";
import { uploadRoutes } from "../module/upload/upload.routes";
import { resourceRoutes } from "../module/resource/resource.routes";
import { teamRoutes } from "../module/team/team.routes";
import { discussionRoutes } from "../module/discussion/discussion.routes";
import { questionRoutes } from "../module/qa/qa.routes";
import { connectionRoutes } from "../module/connection/connection.routes";
import { messageRoutes } from "../module/message/message.routes";
import aiRoutes from "../module/ai/ai.routes";
import { eventRoutes } from "../module/event/event.routes";
import { gamificationRoutes } from "../module/gamification/gamification.routes";
import { notificationRoutes } from "../module/notification/notification.routes";
import { adminRoutes } from "../module/admin/admin.routes";
import { settingsRoutes } from "../module/settings/settings.routes";
import { authRoutes } from "../module/auth/auth.routes";
import { auth } from "../lib/auth";
import {
  passwordResetRateLimiter,
} from "../middleware/rateLimit";
import verifySession from "../middleware/verifySession";

const router: Router = Router();

// Custom auth endpoints mounted BEFORE Better Auth handler
// so they don't get intercepted by the catch-all /auth handler
router.use("/auth", passwordResetRateLimiter, authRoutes);

// Mount Better Auth handler after custom routes to expose OTP endpoints
// This enables: /email-otp/send-verification-otp, /email-otp/verify-email, etc.
router.use("/auth", toNodeHandler(auth));

router.use("/onboarding", onboardingRoutes);
router.use("/verification", verificationRoutes);
router.use("/account", accountRoutes);
router.use("/identity", identityRoutes);
router.use("/upload", uploadRoutes);
router.use("/resources", resourceRoutes);
router.use("/teams", teamRoutes);
router.use("/discussions", discussionRoutes);
router.use("/qa", questionRoutes);
router.use("/connections", connectionRoutes);
router.use("/messages", messageRoutes);
router.use("/ai", aiRoutes);
router.use("/events", eventRoutes);
router.use("/gamification", gamificationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);
router.use("/settings", verifySession, settingsRoutes);

export const IndexRoutes = router;
