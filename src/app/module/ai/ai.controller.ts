import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import aiService from "./ai.service";

// Create a new AI chat session
const createSession = catchAsync(async (req, res) => {
  const result = await aiService.createSession(req.user.id, req.body.title);
  sendResponse(res, {
    httpStatusCode: StatusCodes.CREATED,
    success: true,
    message: "AI chat session created successfully.",
    data: result,
  });
});

// Get all sessions for the authenticated user
const getSessions = catchAsync(async (req, res) => {
  const result = await aiService.getSessions(req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "AI chat sessions retrieved successfully.",
    data: result,
  });
});

// Get a single session with messages
const getSession = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const result = await aiService.getSessionById(sessionId, req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "AI chat session retrieved successfully.",
    data: result,
  });
});

// Delete a session
const deleteSession = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  await aiService.deleteSession(sessionId, req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "AI chat session deleted successfully.",
    data: null,
  });
});

// Send a message and get AI response
const sendMessage = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const result = await aiService.sendMessage(sessionId, req.body.content, req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.CREATED,
    success: true,
    message: "Message sent and AI response generated.",
    data: result,
  });
});

// Get messages in a session
const getMessages = catchAsync(async (req, res) => {
  const sessionId = req.params.sessionId as string;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const result = await aiService.getMessages(sessionId, req.user.id, page, limit);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Messages retrieved successfully.",
    data: result,
  });
});

// Mark a message as helpful/unhelpful
const markHelpful = catchAsync(async (req, res) => {
  const messageId = req.params.messageId as string;
  const result = await aiService.markHelpful(messageId, req.body.isHelpful, req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Message feedback recorded.",
    data: result,
  });
});

// Get current week's study stats
const getStudyStats = catchAsync(async (req, res) => {
  const weekStart = req.query.weekStart ? new Date(req.query.weekStart as string) : undefined;
  const result = await aiService.getStudyStats(req.user.id, weekStart);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Study stats retrieved successfully.",
    data: result,
  });
});

// Get study stats history
const getStudyStatsHistory = catchAsync(async (req, res) => {
  const weeks = Number(req.query.weeks) || 4;
  const result = await aiService.getStudyStatsHistory(req.user.id, weeks);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Study stats history retrieved successfully.",
    data: result,
  });
});

// Placeholder: Summarize PDF
const summarizePdf = catchAsync(async (req, res) => {
  const result = await aiService.summarizePdf(req.body.fileUrl);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "PDF summarization placeholder.",
    data: result,
  });
});

// Placeholder: Generate Quiz
const generateQuiz = catchAsync(async (req, res) => {
  const result = await aiService.generateQuiz(req.body.content, req.body.numQuestions);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Quiz generation placeholder.",
    data: result,
  });
});

// Placeholder: Generate Flashcards
const generateFlashcards = catchAsync(async (req, res) => {
  const result = await aiService.generateFlashcards(req.body.content, req.body.numCards);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Flashcard generation placeholder.",
    data: result,
  });
});

// Placeholder: Explain Code
const explainCode = catchAsync(async (req, res) => {
  const result = await aiService.explainCode(req.body.code, req.body.language);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Code explanation placeholder.",
    data: result,
  });
});

export default {
  createSession,
  getSessions,
  getSession,
  deleteSession,
  sendMessage,
  getMessages,
  markHelpful,
  getStudyStats,
  getStudyStatsHistory,
  summarizePdf,
  generateQuiz,
  generateFlashcards,
  explainCode,
};
