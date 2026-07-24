import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { notificationService } from "../notification/notification.service";
import { buildPaginationQuery, calculatePaginationMeta } from "../../utils/pagination";
import {
  POINT_VALUES,
  MAX_RECIPROCAL_VOTES,
  VOTE_FARMING_WINDOW_MS,
  AwardPointsInput,
  AdminAdjustPointsInput,
  LeaderboardQuery,
  ReputationHistoryQuery,
} from "./gamification.interface";

/**
 * Award reputation points for a specific event.
 * Creates a ReputationPoint record and evaluates badges asynchronously.
 */
const awardPoints = async (input: AwardPointsInput) => {
  const pointValue =
    input.points ?? POINT_VALUES[input.event] ?? 0;

  if (pointValue === 0 && input.event !== "CONTENT_REMOVED" && input.event !== "ADMIN_ADJUSTMENT" && input.event !== "VOTE_REVERSAL") {
    return null;
  }

  const record = await prisma.reputationPoint.create({
    data: {
      userId: input.userId,
      points: pointValue,
      reason: input.reason,
      source: input.source ?? null,
      event: input.event,
    },
  });

  // Evaluate badges asynchronously (fire-and-forget)
  evaluateBadges(input.userId).catch(() => {
    // Silently fail badge evaluation — non-critical path
  });

  return record;
};

/**
 * Get the leaderboard — top users by total reputation points.
 */
const getLeaderboard = async (query: LeaderboardQuery) => {
  const { page = 1, limit = 10 } = query;
  const { skip, take } = buildPaginationQuery({ page, limit, sortBy: "totalPoints", sortOrder: "desc" });

  // Aggregate total points per user, excluding negative floor
  const aggregated = await prisma.reputationPoint.groupBy({
    by: ["userId"],
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    skip,
    take,
  });

  const totalUsers = await prisma.reputationPoint.groupBy({
    by: ["userId"],
  });

  // Fetch user details for the leaderboard entries
  const userIds = aggregated.map((entry) => entry.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: {
      id: true,
      name: true,
      image: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard = aggregated
    .map((entry, index) => ({
      rank: skip + index + 1,
      user: userMap.get(entry.userId) ?? null,
      totalPoints: Math.max(entry._sum.points ?? 0, 0),
    }))
    .filter((entry) => entry.user !== null);

  return {
    data: leaderboard,
    meta: calculatePaginationMeta(totalUsers.length, page, limit),
  };
};

/**
 * Get total reputation points for a specific user.
 */
const getUserPoints = async (userId: string) => {
  const result = await prisma.reputationPoint.aggregate({
    where: { userId },
    _sum: { points: true },
    _count: true,
  });

  return {
    totalPoints: Math.max(result._sum.points ?? 0, 0),
    totalEvents: result._count,
  };
};

/**
 * Reverse previously awarded points (e.g., on content deletion).
 * Creates a reversal record with negative points.
 */
const reversePoints = async (userId: string, event: string, reason: string, source?: string) => {
  const record = await prisma.reputationPoint.create({
    data: {
      userId,
      points: 0,
      reason,
      source: source ?? null,
      event: "CONTENT_REMOVED" as never,
    },
  });

  return record;
};

/**
 * Handle upvote received — award points to the content author.
 * Includes anti-abuse checks.
 */
const handleUpvote = async (
  voterId: string,
  recipientId: string,
  contentType: string,
  contentId: string,
) => {
  // Anti-abuse: self-voting prevention
  if (voterId === recipientId) {
    throw new AppError(status.FORBIDDEN, "You cannot vote on your own content.");
  }

  // Anti-abuse: vote farming detection
  await checkVoteFarming(voterId, recipientId);

  const eventMap: Record<string, string> = {
    RESOURCE: "RESOURCE_UPVOTED_RECEIVED",
    DISCUSSION: "DISCUSSION_UPVOTED_RECEIVED",
    QUESTION: "QUESTION_UPVOTED_RECEIVED",
    ANSWER: "ANSWER_UPVOTED_RECEIVED",
  };

  return awardPoints({
    userId: recipientId,
    event: eventMap[contentType] as never,
    reason: `Upvote received on ${contentType.toLowerCase()}`,
    source: `${contentType}:${contentId}`,
  });
};

/**
 * Handle downvote received — deduct points from the content author and the voter.
 * Includes anti-abuse checks.
 */
const handleDownvote = async (
  voterId: string,
  recipientId: string,
  contentType: string,
  contentId: string,
) => {
  // Anti-abuse: self-voting prevention
  if (voterId === recipientId) {
    throw new AppError(status.FORBIDDEN, "You cannot vote on your own content.");
  }

  // Anti-abuse: vote farming detection
  await checkVoteFarming(voterId, recipientId);

  const eventMap: Record<string, string> = {
    RESOURCE: "RESOURCE_DOWNVOTED_RECEIVED",
    DISCUSSION: "DISCUSSION_DOWNVOTED_RECEIVED",
    QUESTION: "QUESTION_DOWNVOTED_RECEIVED",
    ANSWER: "ANSWER_DOWNVOTED_RECEIVED",
  };

  // Deduct from recipient (author)
  await awardPoints({
    userId: recipientId,
    event: eventMap[contentType] as never,
    reason: `Downvote received on ${contentType.toLowerCase()}`,
    source: `${contentType}:${contentId}`,
  });

  // Also deduct from voter
  const givenEventMap: Record<string, string> = {
    RESOURCE: "RESOURCE_DOWNVOTED_GIVEN",
    DISCUSSION: "RESOURCE_DOWNVOTED_GIVEN",
    QUESTION: "RESOURCE_DOWNVOTED_GIVEN",
    ANSWER: "RESOURCE_DOWNVOTED_GIVEN",
  };

  await awardPoints({
    userId: voterId,
    event: givenEventMap[contentType] as never,
    reason: `Downvote given on ${contentType.toLowerCase()}`,
    source: `${contentType}:${contentId}`,
  });

  return { success: true };
};

/**
 * Handle vote reversal — reverse points when a vote is undone.
 */
const handleVoteReversal = async (
  voterId: string,
  recipientId: string,
  contentType: string,
  contentId: string,
  originalVoteType: "UP" | "DOWN",
) => {
  const eventMap: Record<string, Record<string, string>> = {
    UP: {
      RESOURCE: "RESOURCE_UPVOTED_RECEIVED",
      DISCUSSION: "DISCUSSION_UPVOTED_RECEIVED",
      QUESTION: "QUESTION_UPVOTED_RECEIVED",
      ANSWER: "ANSWER_UPVOTED_RECEIVED",
    },
    DOWN: {
      RESOURCE: "RESOURCE_DOWNVOTED_RECEIVED",
      DISCUSSION: "DISCUSSION_DOWNVOTED_RECEIVED",
      QUESTION: "QUESTION_DOWNVOTED_RECEIVED",
      ANSWER: "ANSWER_DOWNVOTED_RECEIVED",
    },
  };

  const eventType = eventMap[originalVoteType][contentType];

  // Find the original points record
  const originalRecord = await prisma.reputationPoint.findFirst({
    where: {
      userId: recipientId,
      source: `${contentType}:${contentId}`,
      event: eventType as never,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!originalRecord) {
    return null;
  }

  // Create a reversal record
  return awardPoints({
    userId: recipientId,
    event: "VOTE_REVERSAL",
    points: -originalRecord.points,
    reason: `Vote reversal: ${originalVoteType}vote undone on ${contentType.toLowerCase()}`,
    source: `${contentType}:${contentId}`,
  });
};

/**
 * Handle content deleted — reverse all associated points.
 */
const handleContentDeleted = async (
  contentType: string,
  contentId: string,
  authorId: string,
) => {
  const source = `${contentType}:${contentId}`;

  // Find all point records for this content
  const records = await prisma.reputationPoint.findMany({
    where: { source, userId: authorId },
  });

  let totalReversed = 0;

  for (const record of records) {
    if (record.points > 0) {
      await awardPoints({
        userId: authorId,
        event: "CONTENT_REMOVED",
        points: -record.points,
        reason: `Content ${contentType.toLowerCase()} removed`,
        source,
      });
      totalReversed += record.points;
    }
  }

  return { totalReversed };
};

/**
 * Handle content restored — re-award points for restored content.
 */
const handleContentRestored = async (
  contentType: string,
  contentId: string,
  authorId: string,
) => {
  const source = `${contentType}:${contentId}`;

  // Find reversal records
  const reversals = await prisma.reputationPoint.findMany({
    where: {
      source,
      userId: authorId,
      event: "CONTENT_REMOVED",
    },
  });

  let totalReawarded = 0;

  for (const reversal of reversals) {
    if (reversal.points < 0) {
      await awardPoints({
        userId: authorId,
        event: "VOTE_REVERSAL",
        points: -reversal.points,
        reason: `Content ${contentType.toLowerCase()} restored`,
        source,
      });
      totalReawarded += -reversal.points;
    }
  }

  return { totalReawarded };
};

/**
 * Check if the user is voting on their own content.
 */
const checkSelfVoting = async (voterId: string, contentOwnerId: string) => {
  return voterId === contentOwnerId;
};

/**
 * Detect vote farming: >3 reciprocal votes between same two users within 5 minutes.
 */
const checkVoteFarming = async (voterId: string, recipientId: string) => {
  const windowStart = new Date(Date.now() - VOTE_FARMING_WINDOW_MS);

  // Count votes from voter to recipient in the window
  const voterToRecipient = await prisma.reputationPoint.count({
    where: {
      userId: recipientId,
      source: { contains: voterId },
      createdAt: { gte: windowStart },
    },
  });

  // Count votes from recipient to voter in the window
  const recipientToVoter = await prisma.reputationPoint.count({
    where: {
      userId: voterId,
      source: { contains: recipientId },
      createdAt: { gte: windowStart },
    },
  });

  const reciprocalVotes = Math.min(voterToRecipient, recipientToVoter);

  if (reciprocalVotes >= MAX_RECIPROCAL_VOTES) {
    throw new AppError(
      status.TOO_MANY_REQUESTS,
      "Vote farming detected. Please wait before voting again.",
    );
  }
};

/**
 * Admin manual point adjustment with reason.
 */
const adminAdjustPoints = async (input: AdminAdjustPointsInput) => {
  return awardPoints({
    userId: input.userId,
    event: "ADMIN_ADJUSTMENT",
    points: input.points,
    reason: input.reason,
    source: "admin",
  });
};

/**
 * Get paginated reputation history for a user.
 */
const getReputationHistory = async (userId: string, query: ReputationHistoryQuery) => {
  const { page = 1, limit = 20 } = query;
  const { skip, take } = buildPaginationQuery({ page, limit, sortBy: "createdAt", sortOrder: "desc" });

  const where = { userId };

  const [records, total] = await prisma.$transaction([
    prisma.reputationPoint.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.reputationPoint.count({ where }),
  ]);

  return {
    data: records,
    meta: calculatePaginationMeta(total, page, limit),
  };
};

/**
 * Evaluate and award badges based on user's reputation data.
 * Conditions are machine-readable strings like "resources_uploaded:10".
 * Badges are never revoked once unlocked.
 */
const evaluateBadges = async (userId: string) => {
  // Get all badges
  const badges = await prisma.badge.findMany();

  // Get user's existing badges
  const existingUserBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  });
  const unlockedBadgeIds = new Set(existingUserBadges.map((ub) => ub.badgeId));

  // Get user stats for condition evaluation
  const userStats = await getUserStats(userId);

  for (const badge of badges) {
    // Skip already unlocked badges
    if (unlockedBadgeIds.has(badge.id)) continue;

    // Evaluate the badge condition
    if (evaluateCondition(badge.condition, userStats)) {
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
        },
      });

      notificationService.createNotification({
        userId,
        type: "BADGE_UNLOCKED",
        title: "Badge Unlocked",
        message: `You earned the "${badge.name}" badge!`,
        link: "/profile",
      }).catch(() => {});

      // Award badge unlock points
      if (badge.points > 0) {
        await awardPoints({
          userId,
          event: "BADGE_UNLOCKED",
          points: badge.points,
          reason: `Badge unlocked: ${badge.name}`,
          source: `badge:${badge.id}`,
        });
      }
    }
  }
};

/**
 * Get aggregated user stats for badge condition evaluation.
 */
const getUserStats = async (userId: string) => {
  const [resourcesUploaded, discussionsCreated, questionsAsked, answersAccepted, totalPoints] =
    await Promise.all([
      prisma.resource.count({ where: { uploaderId: userId, isDeleted: false } }),
      prisma.discussion.count({ where: { authorId: userId, isDeleted: false } }),
      prisma.question.count({ where: { authorId: userId, isDeleted: false } }),
      prisma.answer.count({ where: { authorId: userId, isAccepted: true, isDeleted: false } }),
      prisma.reputationPoint.aggregate({ where: { userId }, _sum: { points: true } }),
    ]);

  return {
    resources_uploaded: resourcesUploaded,
    discussions_created: discussionsCreated,
    questions_asked: questionsAsked,
    answers_accepted: answersAccepted,
    total_points: Math.max(totalPoints._sum.points ?? 0, 0),
  };
};

/**
 * Evaluate a badge condition string against user stats.
 * Format: "stat_name:threshold" (e.g., "resources_uploaded:10")
 */
const evaluateCondition = (
  condition: string,
  stats: Record<string, number>,
): boolean => {
  const [statName, thresholdStr] = condition.split(":");
  const threshold = parseInt(thresholdStr, 10);
  const currentValue = stats[statName] ?? 0;
  return currentValue >= threshold;
};

const getUserBadges = async (userId: string) => {
  return prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { unlockedAt: "desc" },
  });
};

export const gamificationService = {
  awardPoints,
  getLeaderboard,
  getUserPoints,
  reversePoints,
  handleUpvote,
  handleDownvote,
  handleVoteReversal,
  handleContentDeleted,
  handleContentRestored,
  checkSelfVoting,
  checkVoteFarming,
  adminAdjustPoints,
  getReputationHistory,
  getUserBadges,
};
