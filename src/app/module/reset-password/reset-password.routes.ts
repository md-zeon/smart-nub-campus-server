import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { resetPasswordController } from "./reset-password.controller";
import { resetPasswordValidation } from "./reset-password.validation";

const router: Router = Router();

router.post(
  "/",
  validateRequest(resetPasswordValidation.resetPasswordSchema),
  resetPasswordController.resetPassword,
);

export const resetPasswordRoutes = router;
