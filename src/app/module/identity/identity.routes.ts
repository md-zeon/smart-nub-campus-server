import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
import { identityController } from "./identity.controller";
import { identityValidation } from "./identity.validation";

const router: Router = Router();

router.get("/me", verifySession, identityController.me);

router.get("/profile", verifySession, identityController.getMyProfile);

router.get("/profile/:userId", verifySession, identityController.getPublicProfile);

router.patch(
  "/profile",
  verifySession,
  validateRequest(identityValidation.updateProfileSchema),
  identityController.updateProfile,
);

router.post(
  "/employment",
  verifySession,
  validateRequest(identityValidation.createEmploymentSchema),
  identityController.createEmployment,
);

router.patch(
  "/employment/:id",
  verifySession,
  validateRequest(identityValidation.updateEmploymentSchema),
  identityController.updateEmployment,
);

router.delete(
  "/employment/:id",
  verifySession,
  identityController.deleteEmployment,
);

export const identityRoutes = router;
