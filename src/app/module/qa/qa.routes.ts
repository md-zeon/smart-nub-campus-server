import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
import { qaController } from "./qa.controller";
import { qaValidation } from "./qa.validation";

const router: Router = Router();

router.post(
  "/",
  verifySession,
  validateRequest(qaValidation.createQuestionSchema),
  qaController.createQuestion,
);

router.get("/", verifySession, qaController.listQuestions);

router.get("/categories", verifySession, qaController.listCategories);

router.get("/tags", verifySession, qaController.listTags);

router.get("/contributors", verifySession, qaController.getTopContributors);

router.get("/trending", verifySession, qaController.getTrending);

router.get("/bookmarks", verifySession, qaController.getBookmarkedQuestions);

router.post(
  "/answers/:answerId/vote",
  verifySession,
  validateRequest(qaValidation.voteSchema),
  qaController.voteAnswer,
);

router.get("/:id/answers", verifySession, qaController.listAnswers);

router.get("/:id", verifySession, qaController.getQuestion);

router.put(
  "/:id",
  verifySession,
  validateRequest(qaValidation.updateQuestionSchema),
  qaController.updateQuestion,
);

router.delete("/:id", verifySession, qaController.deleteQuestion);

router.post(
  "/:id/answers",
  verifySession,
  validateRequest(qaValidation.createAnswerSchema),
  qaController.createAnswer,
);

router.delete(
  "/:id/answers/:answerId",
  verifySession,
  qaController.deleteAnswer,
);

router.put(
  "/:id/answers/:answerId/accept",
  verifySession,
  qaController.acceptAnswer,
);

router.delete("/:id/accept", verifySession, qaController.unacceptAnswer);

router.post(
  "/:id/vote",
  verifySession,
  validateRequest(qaValidation.voteSchema),
  qaController.voteQuestion,
);

router.post("/:id/bookmark", verifySession, qaController.bookmarkQuestion);

export const questionRoutes = router;
