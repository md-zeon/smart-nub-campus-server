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
import multer from "multer";
import { UPLOAD_CONFIG } from "../../lib/upload/config";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    const allAllowedMimes = Object.values(UPLOAD_CONFIG.allowedMimeTypes).flat();
    if (allAllowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

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

// --- Attachment Routes ---

router.post(
  "/sessions/:sessionId/attachments",
  verifySession,
  upload.single("file"),
  aiController.uploadAttachment,
);

export default router;
