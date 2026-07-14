import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { forgotPasswordController } from "./forgot-password.controller";
import { forgotPasswordValidation } from "./forgot-password.validation";

const router: Router = Router();

router.post(
  "/",
  validateRequest(forgotPasswordValidation.forgotPasswordSchema),
  forgotPasswordController.forgotPassword,
);

export const forgotPasswordRoutes = router;
