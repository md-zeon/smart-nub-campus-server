import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import { tagController } from "./tag.controller";

const router: Router = Router();

router.get("/", verifySession, tagController.listTags);

router.post("/", verifySession, tagController.createTag);

router.post("/batch", verifySession, tagController.createTags);

export const tagRoutes = router;
