import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router: Router = Router();

router.post(
  "/forgot-password",
  validateRequest(authValidation.forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(authValidation.resetPasswordSchema),
  authController.resetPassword,
);

export const authRoutes = router;
