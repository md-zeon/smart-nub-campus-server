import { prisma } from "../../lib/prisma";
import {
  ActivityFeedResult,
  ActivityItem,
  ActivityListQuery,
  ActivityType,
} from "./activity.interface";

const MAX_LIMIT = 50;

/**
 * Campus-wide activity feed.
 *
 * Combines recent events across resources, discussions, Q&A, team requests,
 * events, and alumni job posts into a single chronological stream.
 * Connections are excluded for privacy.
 *
 * Pagination is cursor-based: each source is queried with `take: limit` and
 * an optional `createdAt < cursor` filter, then the results are merged and
 * sorted by timestamp descending. `hasMore` is true when the merged pool
 * still has items left over, or when any source returned a full page (so
 * older items may exist beyond what we fetched).
 */
const listActivities = async (
  query: ActivityListQuery,
): Promise<ActivityFeedResult> => {
  const limit = Math.min(Math.max(query.limit ?? 20, 1), MAX_LIMIT);
  const type = query.type ?? null;
  const cursor = query.cursor ? new Date(query.cursor) : null;
  const timeFilter = cursor ? { lt: cursor } : undefined;

  const jobs: Promise<{ items: ActivityItem[]; full: boolean }>[] = [];

  if (!type || type === "resource") {
    jobs.push(
      prisma.resource
        .findMany({
          where: { isDeleted: false, createdAt: timeFilter },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            uploader: { select: { id: true, name: true, image: true } },
            course: { select: { code: true } },
            createdAt: true,
          },
        })
        .then((rows) => ({
          items: rows.map((r) => ({
            id: `resource:${r.id}`,
            type: "resource" as ActivityType,
            actor: r.uploader,
            action: "uploaded a resource",
            target: r.title,
            targetId: r.id,
            timestamp: r.createdAt.toISOString(),
          })),
          full: rows.length === limit,
        })),
    );
  }

  if (!type || type === "discussion") {
    jobs.push(
      prisma.discussion
        .findMany({
          where: { isDeleted: false, createdAt: timeFilter },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            author: { select: { id: true, name: true, image: true } },
            createdAt: true,
          },
        })
        .then((rows) => ({
          items: rows.map((r) => ({
            id: `discussion:${r.id}`,
            type: "discussion" as ActivityType,
            actor: r.author,
            action: "started a discussion",
            target: r.title,
            targetId: r.id,
            timestamp: r.createdAt.toISOString(),
          })),
          full: rows.length === limit,
        })),

      prisma.discussionReply
        .findMany({
          where: { isDeleted: false, createdAt: timeFilter },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            author: { select: { id: true, name: true, image: true } },
            discussion: { select: { id: true, title: true } },
            createdAt: true,
          },
        })
        .then((rows) => ({
          items: rows.map((r) => ({
            id: `reply:${r.id}`,
            type: "discussion" as ActivityType,
            actor: r.author,
            action: "replied to a discussion",
            target: r.discussion.title,
            targetId: r.discussion.id,
            timestamp: r.createdAt.toISOString(),
          })),
          full: rows.length === limit,
        })),
    );
  }

  if (!type || type === "question") {
    jobs.push(
      prisma.question
        .findMany({
          where: { isDeleted: false, createdAt: timeFilter },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            author: { select: { id: true, name: true, image: true } },
            createdAt: true,
          },
        })
        .then((rows) => ({
          items: rows.map((r) => ({
            id: `question:${r.id}`,
            type: "question" as ActivityType,
            actor: r.author,
            action: "asked a question",
            target: r.title,
            targetId: r.id,
            timestamp: r.createdAt.toISOString(),
          })),
          full: rows.length === limit,
        })),

      prisma.answer
        .findMany({
          where: { isDeleted: false, createdAt: timeFilter },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            author: { select: { id: true, name: true, image: true } },
            question: { select: { id: true, title: true } },
            createdAt: true,
          },
        })
        .then((rows) => ({
          items: rows.map((r) => ({
            id: `answer:${r.id}`,
            type: "question" as ActivityType,
            actor: r.author,
            action: "answered a question",
            target: r.question.title,
            targetId: r.question.id,
            timestamp: r.createdAt.toISOString(),
          })),
          full: rows.length === limit,
        })),
    );
  }

  if (!type || type === "team") {
    jobs.push(
      prisma.teamRequest
        .findMany({
          where: {
            isDeleted: false,
            status: "OPEN",
            createdAt: timeFilter,
          },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            creator: { select: { id: true, name: true, image: true } },
            createdAt: true,
          },
        })
        .then((rows) => ({
          items: rows.map((r) => ({
            id: `team:${r.id}`,
            type: "team" as ActivityType,
            actor: r.creator,
            action: "is looking for teammates",
            target: r.title,
            targetId: r.id,
            timestamp: r.createdAt.toISOString(),
          })),
          full: rows.length === limit,
        })),
    );
  }

  if (!type || type === "event") {
    jobs.push(
      prisma.event
        .findMany({
          where: { status: "UPCOMING", createdAt: timeFilter },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            organizer: { select: { id: true, name: true, image: true } },
            createdAt: true,
          },
        })
        .then((rows) => ({
          items: rows.map((r) => ({
            id: `event:${r.id}`,
            type: "event" as ActivityType,
            actor: r.organizer ?? null,
            action: r.organizer
              ? "announced an event"
              : "New event announced",
            target: r.title,
            targetId: r.id,
            timestamp: r.createdAt.toISOString(),
          })),
          full: rows.length === limit,
        })),
    );
  }

  if (!type || type === "job") {
    jobs.push(
      prisma.jobPost
        .findMany({
          where: { status: "OPEN", createdAt: timeFilter },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            postedBy: { select: { id: true, name: true, image: true } },
            createdAt: true,
          },
        })
        .then((rows) => ({
          items: rows.map((r) => ({
            id: `job:${r.id}`,
            type: "job" as ActivityType,
            actor: r.postedBy,
            action: "posted a job",
            target: r.title,
            targetId: r.id,
            timestamp: r.createdAt.toISOString(),
          })),
          full: rows.length === limit,
        })),
    );
  }

  const results = await Promise.all(jobs);
  const merged = results
    .flatMap((r) => r.items)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  const page = merged.slice(0, limit);
  const anySourceFull = results.some((r) => r.full);
  const hasMore = merged.length > limit || anySourceFull;
  const nextCursor = page.length > 0 ? page[page.length - 1].timestamp : null;

  return { items: page, nextCursor, hasMore };
};

export const activityService = {
  listActivities,
};
