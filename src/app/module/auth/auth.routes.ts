import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import verifySession from "../../middleware/verifySession";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router: Router = Router();

// Public endpoint
router.post(
  "/login",
  validateRequest(authValidation.loginSchema),
  authController.login,
);

// Protected endpoints
router.post("/logout", verifySession, authController.logout);
router.get("/me", verifySession, authController.me);

export const authRoutes = router;
