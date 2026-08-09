/**
 * Activity feed module types.
 * Aggregates recent campus-wide activity across resources, discussions,
 * Q&A, team requests, events, and alumni job posts.
 *
 * Connections are intentionally excluded: who connects with whom is a
 * private, two-party relationship and should not be broadcast campus-wide.
 */

export type ActivityType =
  | "resource"
  | "discussion"
  | "question"
  | "team"
  | "event"
  | "job";

export interface ActivityActor {
  id: string;
  name: string;
  image?: string | null;
}

export interface ActivityItem {
  /** Stable unique id for the feed item: `${source}:${id}`. */
  id: string;
  type: ActivityType;
  actor: ActivityActor | null;
  /** Human-readable action, e.g. "uploaded a resource". */
  action: string;
  /** The object of the action, e.g. a resource title or person's name. */
  target: string;
  /** Route id used by the client to build the target link. */
  targetId: string;
  timestamp: string;
}

export interface ActivityListQuery {
  limit?: number;
  type?: ActivityType;
  /** ISO timestamp cursor — return items created strictly before it. */
  cursor?: string;
}

export interface ActivityFeedResult {
  items: ActivityItem[];
  nextCursor: string | null;
  hasMore: boolean;
}
