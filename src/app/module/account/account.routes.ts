import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { accountController } from "./account.controller";
import { accountValidation } from "./account.validation";
import verifySession from "../../middleware/verifySession";

const router: Router = Router();

router.post(
  "/create",
  validateRequest(accountValidation.createAccountSchema),
  accountController.createAccount,
);

router.get(
  "/email-by-student-id/:id",
  verifySession,
  accountController.getEmailByStudentId,
);

export const accountRoutes = router;
