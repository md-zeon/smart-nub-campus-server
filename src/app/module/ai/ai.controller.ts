import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import aiService from "./ai.service";

const createSession = catchAsync(async (req, res) => {
  const result = await aiService.createSession(req.user.id, req.body.title);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "AI chat session created successfully.",
    data: result,
  });
});

const getSessions = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await aiService.getSessions(req.user.id, page, limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI chat sessions retrieved successfully.",
    data: result,
  });
});

const getSession = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const result = await aiService.getSessionById(sessionId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI chat session retrieved successfully.",
    data: result,
  });
});

const deleteSession = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  await aiService.deleteSession(sessionId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "AI chat session deleted successfully.",
    data: null,
  });
});

const sendMessage = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const result = await aiService.sendMessage(sessionId, req.body.content, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Message sent and AI response generated.",
    data: result,
  });
});

const streamMessage = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const { content } = req.body;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let aborted = false;
  res.on("close", () => {
    aborted = true;
  });

  await aiService.sendMessageStream(
    sessionId,
    content,
    req.user.id,
    (token: string) => {
      if (!aborted) {
        res.write(`data: ${JSON.stringify({ type: "text", content: token })}\n\n`);
      }
    },
    () => {
      if (!aborted) {
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    },
    (error: Error) => {
      if (!aborted) {
        res.write(`data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`);
        res.end();
      }
    },
  );
});

const getMessages = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const result = await aiService.getMessages(sessionId, req.user.id, page, limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Messages retrieved successfully.",
    data: result,
  });
});

const markHelpful = catchAsync(async (req, res) => {
  const messageId = req.params.messageId as string;
  const result = await aiService.markHelpful(messageId, req.body.isHelpful, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Message feedback recorded.",
    data: result,
  });
});

const getStudyStats = catchAsync(async (req, res) => {
  const weekStart = req.query.weekStart ? new Date(req.query.weekStart as string) : undefined;
  const result = await aiService.getStudyStats(req.user.id, weekStart);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Study stats retrieved successfully.",
    data: result,
  });
});

const getStudyStatsHistory = catchAsync(async (req, res) => {
  const weeks = Number(req.query.weeks) || 4;
  const result = await aiService.getStudyStatsHistory(req.user.id, weeks);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Study stats history retrieved successfully.",
    data: result,
  });
});

const summarizePdf = catchAsync(async (req, res) => {
  const result = await aiService.summarizePdf(req.user.id, req.body.fileUrl);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "PDF summarized successfully.",
    data: result,
  });
});

const generateQuiz = catchAsync(async (req, res) => {
  const result = await aiService.generateQuiz(req.user.id, req.body.content, req.body.numQuestions);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Quiz generated successfully.",
    data: result,
  });
});

const generateFlashcards = catchAsync(async (req, res) => {
  const result = await aiService.generateFlashcards(req.body.content, req.body.numCards);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Flashcards generated successfully.",
    data: result,
  });
});

const explainCode = catchAsync(async (req, res) => {
  const result = await aiService.explainCode(req.body.code, req.body.language);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Code explained successfully.",
    data: result,
  });
});

const uploadAttachment = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const file = req.file as Express.Multer.File;
  const originalName = (req.file as Express.Multer.File)?.originalname || "unknown";

  const result = await aiService.uploadAttachment(sessionId, req.user.id, file, originalName);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Attachment uploaded successfully.",
    data: result,
  });
});

export default {
  createSession,
  getSessions,
  getSession,
  deleteSession,
  sendMessage,
  streamMessage,
  getMessages,
  markHelpful,
  getStudyStats,
  getStudyStatsHistory,
  summarizePdf,
  generateQuiz,
  generateFlashcards,
  explainCode,
  uploadAttachment,
};
