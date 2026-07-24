import { ReputationEvent } from "../../../generated/prisma/enums";

/** Point values for each reputation event */
export const POINT_VALUES: Record<ReputationEvent, number> = {
  RESOURCE_UPLOADED: 10,
  RESOURCE_UPVOTED_RECEIVED: 2,
  DISCUSSION_CREATED: 2,
  DISCUSSION_UPVOTED_RECEIVED: 2,
  QUESTION_ASKED: 1,
  QUESTION_UPVOTED_RECEIVED: 2,
  ANSWER_UPVOTED_RECEIVED: 2,
  ANSWER_ACCEPTED: 15,
  REPLY_POSTED: 1,
  PROFILE_COMPLETED: 5,
  BADGE_UNLOCKED: 0,
  RESOURCE_DOWNVOTED_RECEIVED: -1,
  RESOURCE_DOWNVOTED_GIVEN: -1,
  DISCUSSION_DOWNVOTED_RECEIVED: -1,
  QUESTION_DOWNVOTED_RECEIVED: -1,
  ANSWER_DOWNVOTED_RECEIVED: -1,
  ANSWER_UNACCEPTED: -15,
  CONTENT_REMOVED: 0,
  ADMIN_ADJUSTMENT: 0,
  VOTE_REVERSAL: 0,
};

/** Anti-abuse: maximum reciprocal votes within the time window */
export const MAX_RECIPROCAL_VOTES = 3;
/** Anti-abuse: time window in milliseconds (5 minutes) */
export const VOTE_FARMING_WINDOW_MS = 5 * 60 * 1000;

export interface AwardPointsInput {
  userId: string;
  event: ReputationEvent;
  points?: number;
  reason: string;
  source?: string;
}

export interface AdminAdjustPointsInput {
  userId: string;
  points: number;
  reason: string;
}

export interface LeaderboardQuery {
  page?: number;
  limit?: number;
}

export interface ReputationHistoryQuery {
  page?: number;
  limit?: number;
}
