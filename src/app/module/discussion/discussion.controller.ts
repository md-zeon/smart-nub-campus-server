import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { discussionService } from "./discussion.service";
import { ListDiscussionsQuery } from "./discussion.interface";

const createDiscussion = catchAsync(async (req, res) => {
  const result = await discussionService.createDiscussion(req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Discussion created successfully.",
    data: result,
  });
});

const getDiscussion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await discussionService.getDiscussion(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussion retrieved successfully.",
    data: result,
  });
});

const listDiscussions = catchAsync(async (req, res) => {
  const query: ListDiscussionsQuery = {
    category: req.query.category as string | undefined,
    tag: req.query.tag as string | undefined,
    visibility: req.query.visibility as ListDiscussionsQuery["visibility"],
    search: req.query.search as string | undefined,
    sort: (req.query.sort as ListDiscussionsQuery["sort"]) || "latest",
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 12,
  };

  const result = await discussionService.listDiscussions(query, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussions retrieved successfully.",
    data: result,
  });
});

const updateDiscussion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await discussionService.updateDiscussion(id, req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussion updated successfully.",
    data: result,
  });
});

const deleteDiscussion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await discussionService.deleteDiscussion(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const createReply = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await discussionService.createReply(id, req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Reply created successfully.",
    data: result,
  });
});

const deleteReply = catchAsync(async (req, res) => {
  const replyId = req.params.replyId as string;
  const result = await discussionService.deleteReply(replyId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const voteDiscussion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await discussionService.voteDiscussion(id, req.user.id, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote recorded successfully.",
    data: result,
  });
});

const voteReply = catchAsync(async (req, res) => {
  const replyId = req.params.replyId as string;
  const result = await discussionService.voteReply(replyId, req.user.id, req.body);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote recorded successfully.",
    data: result,
  });
});

const bookmarkDiscussion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await discussionService.bookmarkDiscussion(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.action === "added" ? "Bookmarked successfully." : "Bookmark removed.",
    data: result,
  });
});

const pinDiscussion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await discussionService.pinDiscussion(id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.isPinned ? "Discussion pinned." : "Discussion unpinned.",
    data: result,
  });
});

const lockDiscussion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await discussionService.lockDiscussion(id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.isLocked ? "Discussion locked." : "Discussion unlocked.",
    data: result,
  });
});

const markSolved = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await discussionService.markSolved(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.isSolved ? "Marked as solved." : "Solved status removed.",
    data: result,
  });
});

const getBookmarkedDiscussions = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const result = await discussionService.getBookmarkedDiscussions(req.user.id, page, limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Bookmarked discussions retrieved successfully.",
    data: result,
  });
});

const listCategories = catchAsync(async (_req, res) => {
  const result = await discussionService.listCategories();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussion categories retrieved successfully.",
    data: result,
  });
});

const listTags = catchAsync(async (_req, res) => {
  const result = await discussionService.listTags();
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussion tags retrieved successfully.",
    data: result,
  });
});

const getTrending = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 3;
  const result = await discussionService.getTrending(limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Trending discussions retrieved successfully.",
    data: result,
  });
});

const getTopContributors = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const result = await discussionService.getTopContributors(limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Top contributors retrieved successfully.",
    data: result,
  });
});

const getMyDiscussions = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const result = await discussionService.getMyDiscussions(req.user.id, page, limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your discussions retrieved successfully.",
    data: result,
  });
});

const getMyReplies = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const result = await discussionService.getMyReplies(req.user.id, page, limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussions you replied to retrieved successfully.",
    data: result,
  });
});

const listReplies = catchAsync(async (req, res) => {
  const discussionId = req.params.id as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const sort = (req.query.sort as string) || "newest";
  const result = await discussionService.listReplies(discussionId, req.user.id, { page, limit, sort: sort as "upvotes" | "newest" | "oldest" });
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Replies retrieved successfully.",
    data: result,
  });
});

export const discussionController = {
  createDiscussion,
  getDiscussion,
  listDiscussions,
  updateDiscussion,
  deleteDiscussion,
  createReply,
  deleteReply,
  voteDiscussion,
  voteReply,
  bookmarkDiscussion,
  pinDiscussion,
  lockDiscussion,
  markSolved,
  getBookmarkedDiscussions,
  listCategories,
  listTags,
  getTrending,
  getTopContributors,
  getMyDiscussions,
  getMyReplies,
  listReplies,
};
