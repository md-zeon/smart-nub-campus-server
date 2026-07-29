import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { accountController } from "./account.controller";
import { accountValidation } from "./account.validation";

const router: Router = Router();

router.post(
  "/create",
  validateRequest(accountValidation.createAccountSchema),
  accountController.createAccount,
);

router.get(
  "/email-by-student-id/:id",
  accountController.getEmailByStudentId,
);

export const accountRoutes = router;
