import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { gamificationService } from "./gamification.service";
import { LeaderboardQuery, ReputationHistoryQuery } from "./gamification.interface";

const awardPoints = catchAsync(async (req, res) => {
  const result = await gamificationService.awardPoints({
    userId: req.body.userId,
    event: req.body.event,
    points: req.body.points,
    reason: req.body.reason,
    source: req.body.source,
  });
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Points awarded successfully.",
    data: result,
  });
});

const getLeaderboard = catchAsync(async (req, res) => {
  const query: LeaderboardQuery = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
  };
  const result = await gamificationService.getLeaderboard(query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Leaderboard retrieved successfully.",
    data: result,
  });
});

const getUserPoints = catchAsync(async (req, res) => {
  const userId = req.params.userId as string;
  const result = await gamificationService.getUserPoints(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User points retrieved successfully.",
    data: result,
  });
});

const getMyPoints = catchAsync(async (req, res) => {
  const result = await gamificationService.getUserPoints(req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your points retrieved successfully.",
    data: result,
  });
});

const handleUpvote = catchAsync(async (req, res) => {
  const result = await gamificationService.handleUpvote(
    req.user.id,
    req.body.recipientId,
    req.body.contentType,
    req.body.contentId,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Upvote points awarded.",
    data: result,
  });
});

const handleDownvote = catchAsync(async (req, res) => {
  const result = await gamificationService.handleDownvote(
    req.user.id,
    req.body.recipientId,
    req.body.contentType,
    req.body.contentId,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Downvote points processed.",
    data: result,
  });
});

const handleVoteReversal = catchAsync(async (req, res) => {
  const result = await gamificationService.handleVoteReversal(
    req.user.id,
    req.body.recipientId,
    req.body.contentType,
    req.body.contentId,
    req.body.voteType,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Vote reversal processed.",
    data: result,
  });
});

const adminAdjustPoints = catchAsync(async (req, res) => {
  const result = await gamificationService.adminAdjustPoints({
    userId: req.body.userId,
    points: req.body.points,
    reason: req.body.reason,
  });
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Points adjusted successfully.",
    data: result,
  });
});

const getReputationHistory = catchAsync(async (req, res) => {
  const userId = req.params.userId as string;
  const query: ReputationHistoryQuery = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  const result = await gamificationService.getReputationHistory(userId, query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reputation history retrieved successfully.",
    data: result,
  });
});

const getMyReputationHistory = catchAsync(async (req, res) => {
  const query: ReputationHistoryQuery = {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  const result = await gamificationService.getReputationHistory(req.user.id, query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your reputation history retrieved successfully.",
    data: result,
  });
});

const getMyBadges = catchAsync(async (req, res) => {
  const { prisma } = await import("../../lib/prisma");
  const userBadges = await prisma.userBadge.findMany({
    where: { userId: req.user.id },
    include: { badge: true },
    orderBy: { unlockedAt: "desc" },
  });
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your badges retrieved successfully.",
    data: userBadges,
  });
});

export const gamificationController = {
  awardPoints,
  getLeaderboard,
  getUserPoints,
  getMyPoints,
  handleUpvote,
  handleDownvote,
  handleVoteReversal,
  adminAdjustPoints,
  getReputationHistory,
  getMyReputationHistory,
  getMyBadges,
};
