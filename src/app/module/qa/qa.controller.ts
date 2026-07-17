import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { qaService } from "./qa.service";
import { ListQuestionsQuery } from "./qa.interface";

const createQuestion = catchAsync(async (req, res) => {
  const result = await qaService.createQuestion(req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Question created successfully.",
    data: result,
  });
});

const getQuestion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await qaService.getQuestion(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Question retrieved successfully.",
    data: result,
  });
});

const listQuestions = catchAsync(async (req, res) => {
  const query: ListQuestionsQuery = {
    category: req.query.category as string | undefined,
    tag: req.query.tag as string | undefined,
    search: req.query.search as string | undefined,
    answered: req.query.answered as string | undefined,
    sort: (req.query.sort as ListQuestionsQuery["sort"]) || "latest",
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 12,
  };

  const result = await qaService.listQuestions(query, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Questions retrieved successfully.",
    data: result,
  });
});

const updateQuestion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await qaService.updateQuestion(id, req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Question updated successfully.",
    data: result,
  });
});

const deleteQuestion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await qaService.deleteQuestion(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const createAnswer = catchAsync(async (req, res) => {
  const questionId = req.params.id as string;
  const result = await qaService.createAnswer(questionId, req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Answer created successfully.",
    data: result,
  });
});

const deleteAnswer = catchAsync(async (req, res) => {
  const answerId = req.params.answerId as string;
  const result = await qaService.deleteAnswer(answerId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const acceptAnswer = catchAsync(async (req, res) => {
  const questionId = req.params.id as string;
  const answerId = req.params.answerId as string;
  const result = await qaService.acceptAnswer(questionId, answerId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Answer accepted successfully.",
    data: result,
  });
});

const unacceptAnswer = catchAsync(async (req, res) => {
  const questionId = req.params.id as string;
  const result = await qaService.unacceptAnswer(questionId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Accepted answer removed.",
    data: result,
  });
});

const voteQuestion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await qaService.voteQuestion(id, req.user.id, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote recorded successfully.",
    data: result,
  });
});

const voteAnswer = catchAsync(async (req, res) => {
  const answerId = req.params.answerId as string;
  const result = await qaService.voteAnswer(answerId, req.user.id, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote recorded successfully.",
    data: result,
  });
});

const bookmarkQuestion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await qaService.bookmarkQuestion(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.action === "added" ? "Bookmarked successfully." : "Bookmark removed.",
    data: result,
  });
});

const getBookmarkedQuestions = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const result = await qaService.getBookmarkedQuestions(req.user.id, page, limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Bookmarked questions retrieved successfully.",
    data: result,
  });
});

export const qaController = {
  createQuestion,
  getQuestion,
  listQuestions,
  updateQuestion,
  deleteQuestion,
  createAnswer,
  deleteAnswer,
  acceptAnswer,
  unacceptAnswer,
  voteQuestion,
  voteAnswer,
  bookmarkQuestion,
  getBookmarkedQuestions,
};
