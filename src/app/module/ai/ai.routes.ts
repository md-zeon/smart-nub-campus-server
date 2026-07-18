import { Router } from "express";
import verifySession from "../../middleware/verifySession";
import validateRequest from "../../middleware/validateRequest";
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

// Create a new chat session
router.post(
  "/sessions",
  verifySession,
  validateRequest(createSessionSchema),
  aiController.createSession,
);

// Get all chat sessions for the user
router.get("/sessions", verifySession, aiController.getSessions);

// Get a single chat session with messages
router.get("/sessions/:sessionId", verifySession, aiController.getSession);

// Delete a chat session
router.delete("/sessions/:sessionId", verifySession, aiController.deleteSession);

// --- Message Routes ---

// Send a message in a chat session
router.post(
  "/sessions/:sessionId/messages",
  verifySession,
  validateRequest(sendMessageSchema),
  aiController.sendMessage,
);

// Get messages in a chat session
router.get(
  "/sessions/:sessionId/messages",
  verifySession,
  aiController.getMessages,
);

// Mark a message as helpful/unhelpful
router.patch(
  "/messages/:messageId/helpful",
  verifySession,
  validateRequest(markHelpfulSchema),
  aiController.markHelpful,
);

// --- Study Stats Routes ---

// Get current week's study stats
router.get("/stats", verifySession, aiController.getStudyStats);

// Get study stats history
router.get("/stats/history", verifySession, aiController.getStudyStatsHistory);

// --- Placeholder Tool Routes ---

// Summarize PDF
router.post(
  "/tools/summarize-pdf",
  verifySession,
  validateRequest(summarizePdfSchema),
  aiController.summarizePdf,
);

// Generate Quiz
router.post(
  "/tools/generate-quiz",
  verifySession,
  validateRequest(generateQuizSchema),
  aiController.generateQuiz,
);

// Generate Flashcards
router.post(
  "/tools/generate-flashcards",
  verifySession,
  validateRequest(generateFlashcardsSchema),
  aiController.generateFlashcards,
);

// Explain Code
router.post(
  "/tools/explain-code",
  verifySession,
  validateRequest(explainCodeSchema),
  aiController.explainCode,
);

export default router;
