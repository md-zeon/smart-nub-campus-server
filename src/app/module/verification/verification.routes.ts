import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { verificationController } from "./verification.controller";
import { verificationValidation } from "./verification.validation";

const router: Router = Router();

router.post(
  "/request",
  validateRequest(verificationValidation.createVerificationRequestSchema),
  verificationController.createVerificationRequest,
);

export const verificationRoutes = router;
