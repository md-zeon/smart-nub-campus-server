import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
import { searchController } from "./search.controller";
import { searchValidation } from "./search.validation";

const router: Router = Router();

router.get(
  "/",
  verifySession,
  validateRequest(searchValidation.searchQuerySchema, "query"),
  searchController.search,
);

export const searchRoutes = router;
