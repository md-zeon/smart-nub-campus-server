import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import { identityController } from "./identity.controller";

const router: Router = Router();

router.get("/me", verifySession, identityController.me);

export const identityRoutes = router;
