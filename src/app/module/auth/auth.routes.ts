import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import {
  otpRateLimiter,
  passwordResetRateLimiter,
} from "../../middleware/rateLimit";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router: Router = Router();

router.post(
  "/forgot-password",
  otpRateLimiter,
  validateRequest(authValidation.forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  passwordResetRateLimiter,
  validateRequest(authValidation.resetPasswordSchema),
  authController.resetPassword,
);

export const authRoutes = router;
