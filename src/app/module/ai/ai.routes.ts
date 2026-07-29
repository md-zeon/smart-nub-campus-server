import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
import { aiChatRateLimiter, aiToolRateLimiter } from "../../middleware/rateLimit";
import aiController from "./ai.controller";
import {
  createSessionSchema,
  sendMessageSchema,
  markHelpfulSchema,
  summarizePdfSchema,
  generateQuizSchema,
  generateFlashcardsSchema,
  explainCodeSchema,
} from "./ai.validation";

const router = Router();

// --- Chat Session Routes ---

router.post(
  "/sessions",
  verifySession,
  validateRequest(createSessionSchema),
  aiController.createSession,
);

router.get("/sessions", verifySession, aiController.getSessions);

router.get("/sessions/:sessionId", verifySession, aiController.getSession);

router.delete("/sessions/:sessionId", verifySession, aiController.deleteSession);

// --- Message Routes ---

router.post(
  "/sessions/:sessionId/messages",
  verifySession,
  aiChatRateLimiter,
  validateRequest(sendMessageSchema),
  aiController.sendMessage,
);

router.post(
  "/sessions/:sessionId/messages/stream",
  verifySession,
  aiChatRateLimiter,
  validateRequest(sendMessageSchema),
  aiController.streamMessage,
);

router.get(
  "/sessions/:sessionId/messages",
  verifySession,
  aiController.getMessages,
);

router.patch(
  "/messages/:messageId/helpful",
  verifySession,
  validateRequest(markHelpfulSchema),
  aiController.markHelpful,
);

// --- Study Stats Routes ---

router.get("/stats", verifySession, aiController.getStudyStats);

router.get("/stats/history", verifySession, aiController.getStudyStatsHistory);

// --- Tool Routes ---

router.post(
  "/tools/summarize-pdf",
  verifySession,
  aiToolRateLimiter,
  validateRequest(summarizePdfSchema),
  aiController.summarizePdf,
);

router.post(
  "/tools/generate-quiz",
  verifySession,
  aiToolRateLimiter,
  validateRequest(generateQuizSchema),
  aiController.generateQuiz,
);

router.post(
  "/tools/generate-flashcards",
  verifySession,
  aiToolRateLimiter,
  validateRequest(generateFlashcardsSchema),
  aiController.generateFlashcards,
);

router.post(
  "/tools/explain-code",
  verifySession,
  aiToolRateLimiter,
  validateRequest(explainCodeSchema),
  aiController.explainCode,
);

export default router;
