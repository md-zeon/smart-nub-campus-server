import status from "http-status";
import { VoteType } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { softDelete } from "../../shared/softDelete";
import { notificationService } from "../notification/notification.service";
import { gamificationService } from "../gamification/gamification.service";
import { getSocketServer } from "../../lib/socket";
import {
  CreateDiscussionInput,
  CreateReplyInput,
  ListDiscussionsQuery,
  UpdateDiscussionInput,
  VoteInput,
} from "./discussion.interface";

/**
 * Checks if the current user can view a discussion based on visibility rules.
 * PUBLIC: any authenticated user.
 * DEPARTMENT: same department as the author.
 * BATCH: same batch year as the author.
 */
const checkVisibility = async (
  discussionAuthorId: string,
  visibility: string,
  viewerId: string,
) => {
  if (visibility === "PUBLIC") return;

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    include: { student: true, profile: true },
  });

  if (!viewer) {
    throw new AppError(status.FORBIDDEN, "User not found.");
  }

  const author = await prisma.user.findUnique({
    where: { id: discussionAuthorId },
    include: { student: true, profile: true },
  });

  if (!author) {
    throw new AppError(status.NOT_FOUND, "Discussion author not found.");
  }

  if (visibility === "DEPARTMENT") {
    if (!viewer.student || !author.student) {
      throw new AppError(status.FORBIDDEN, "Department information not available.");
    }
    if (viewer.student.department !== author.student.department) {
      throw new AppError(status.FORBIDDEN, "This discussion is only visible to your department.");
    }
  }

  if (visibility === "BATCH") {
    if (!viewer.profile?.batchYear || !author.profile?.batchYear) {
      throw new AppError(status.FORBIDDEN, "Batch information not available.");
    }
    if (viewer.profile.batchYear !== author.profile.batchYear) {
      throw new AppError(status.FORBIDDEN, "This discussion is only visible to your batch.");
    }
  }
};

/**
 * Builds a visibility where clause for the current user.
 * PUBLIC discussions are always visible.
 * DEPARTMENT discussions are visible only if the user shares the author's department.
 * BATCH discussions are visible only if the user shares the author's batch year.
 */
const buildVisibilityWhere = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: true, profile: true },
  });

  if (!user) {
    return { visibility: "PUBLIC" as const };
  }

  // Build OR conditions: PUBLIC always visible, plus DEPARTMENT/BATCH for matching users
  const conditions: Record<string, unknown>[] = [{ visibility: "PUBLIC" }];

  if (user.student?.department) {
    conditions.push({
      visibility: "DEPARTMENT",
      author: { student: { department: user.student.department } },
    });
  }

  if (user.profile?.batchYear) {
    conditions.push({
      visibility: "BATCH",
      author: { profile: { batchYear: user.profile.batchYear } },
    });
  }

  return { OR: conditions };
};

/**
 * Creates a new discussion with optional tags.
 * Validates category exists and enforces visibility rules.
 */
const createDiscussion = async (data: CreateDiscussionInput, userId: string) => {
  // Verify category exists
  const category = await prisma.discussionCategory.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Discussion category not found.");
  }

  // Verify course exists if provided
  if (data.courseId) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) {
      throw new AppError(status.NOT_FOUND, "Course not found.");
    }
  }

  const discussion = await prisma.discussion.create({
    data: {
      title: data.title,
      content: data.content,
      categoryId: data.categoryId,
      courseId: data.courseId ?? null,
      authorId: userId,
      visibility: data.visibility ?? "PUBLIC",
      discussionTags: data.tagIds?.length
        ? {
            create: data.tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      category: true,
      course: true,
      author: { select: { id: true, name: true, email: true, image: true } },
      discussionTags: { include: { tag: true } },
    },
  });

  gamificationService
    .awardPoints({
      userId,
      event: "DISCUSSION_CREATED",
      reason: `Created discussion: ${data.title}`,
      source: `DISCUSSION:${discussion.id}`,
    })
    .catch(() => {});

  return discussion;
};

/**
 * Gets a single discussion by ID.
 * Increments view count and enforces visibility.
 * Returns user vote and bookmark state if userId provided.
 */
const getDiscussion = async (id: string, userId?: string) => {
  const discussion = await prisma.discussion.findUnique({
    where: { id, isDeleted: false },
    include: {
      category: true,
      course: true,
      author: { select: { id: true, name: true, email: true, image: true } },
      discussionTags: { include: { tag: true } },
      _count: { select: { discussionReplies: true, discussionBookmarks: true } },
    },
  });

  if (!discussion) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  // Enforce visibility
  if (userId) {
    await checkVisibility(discussion.authorId, discussion.visibility, userId);
  }

  // Increment view count
  await prisma.discussion.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  // Fetch user state (vote + bookmark)
  let userVote: VoteType | null = null;
  let isBookmarked = false;

  if (userId) {
    const vote = await prisma.discussionVote.findUnique({
      where: { discussionId_userId: { discussionId: id, userId } },
      select: { type: true },
    });
    userVote = vote?.type ?? null;

    const bookmark = await prisma.discussionBookmark.findUnique({
      where: { discussionId_userId: { discussionId: id, userId } },
      select: { id: true },
    });
    isBookmarked = !!bookmark;
  }

  return {
    ...discussion,
    viewCount: discussion.viewCount + 1,
    userVote,
    isBookmarked,
  };
};

/**
 * Lists discussions with pagination, filters, and visibility enforcement.
 * Pinned discussions always appear first.
 */
const listDiscussions = async (query: ListDiscussionsQuery, userId?: string) => {
  const {
    category,
    tag,
    visibility,
    search,
    sort = "latest",
    page = 1,
    limit = 12,
  } = query;

  const skip = (page - 1) * limit;
  const take = limit;

  const where: Record<string, unknown> = { isDeleted: false };

  // Filter by category slug
  if (category) {
    where.category = { slug: category };
  }

  // Filter by tag slug(s) — comma-separated, matches discussions having
  // ALL of the selected tags (AND semantics)
  if (tag) {
    const tagSlugs = tag
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    for (const slug of tagSlugs) {
      where.discussionTags = { some: { tag: { slug } } };
    }
  }

  // Filter by specific visibility
  if (visibility) {
    where.visibility = visibility;
  } else if (userId) {
    // Apply visibility rules based on user's department/batch
    const visibilityFilter = await buildVisibilityWhere(userId);
    Object.assign(where, visibilityFilter);
  }

  // Search in title and content
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sort options
  let orderBy: Record<string, unknown>[];
  switch (sort) {
    case "popular":
      orderBy = [{ isPinned: "desc" }, { upvoteCount: "desc" }];
      break;
    case "unanswered":
      orderBy = [{ isPinned: "desc" }, { replyCount: "asc" }];
      break;
    case "latest":
    default:
      orderBy = [{ isPinned: "desc" }, { createdAt: "desc" }];
      break;
  }

  const [discussions, total] = await prisma.$transaction([
    prisma.discussion.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        course: { select: { id: true, code: true, name: true } },
        author: { select: { id: true, name: true, image: true } },
        discussionTags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { discussionReplies: true } },
      },
    }),
    prisma.discussion.count({ where }),
  ]);

  // Enrich with user vote/bookmark state
  let discussionsWithUserState = discussions;

  if (userId) {
    const discussionIds = discussions.map((d) => d.id);

    const [votes, bookmarks] = await Promise.all([
      prisma.discussionVote.findMany({
        where: { discussionId: { in: discussionIds }, userId },
        select: { discussionId: true, type: true },
      }),
      prisma.discussionBookmark.findMany({
        where: { discussionId: { in: discussionIds }, userId },
        select: { discussionId: true },
      }),
    ]);

    const voteMap = new Map(votes.map((v) => [v.discussionId, v.type]));
    const bookmarkSet = new Set(bookmarks.map((b) => b.discussionId));

    discussionsWithUserState = discussions.map((d) => ({
      ...d,
      userVote: voteMap.get(d.id) ?? null,
      isBookmarked: bookmarkSet.has(d.id),
    }));
  }

  return {
    data: discussionsWithUserState,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Updates a discussion. Only the author can update.
 */
const updateDiscussion = async (
  id: string,
  data: UpdateDiscussionInput,
  userId: string,
) => {
  const existing = await prisma.discussion.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  if (existing.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only edit your own discussions.");
  }

  // Validate category if changing
  if (data.categoryId) {
    const category = await prisma.discussionCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new AppError(status.NOT_FOUND, "Discussion category not found.");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.courseId !== undefined) updateData.courseId = data.courseId;
  if (data.visibility !== undefined) updateData.visibility = data.visibility;

  return prisma.$transaction(async (tx) => {
    await tx.discussion.update({ where: { id }, data: updateData });

    // Replace tags if provided
    if (data.tagIds) {
      await tx.discussionTag.deleteMany({ where: { discussionId: id } });
      await tx.discussionTag.createMany({
        data: data.tagIds.map((tagId) => ({ discussionId: id, tagId })),
      });
    }

    return tx.discussion.findUnique({
      where: { id },
      include: {
        category: true,
        course: true,
        author: { select: { id: true, name: true, email: true, image: true } },
        discussionTags: { include: { tag: true } },
      },
    });
  });
};

/**
 * Soft deletes a discussion. Only the author can delete.
 */
const deleteDiscussion = async (id: string, userId: string) => {
  const existing = await prisma.discussion.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  if (existing.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own discussions.");
  }

  await softDelete(prisma.discussion, id);

  gamificationService
    .handleContentDeleted("DISCUSSION", id, existing.authorId)
    .catch(() => {});

  return { message: "Discussion deleted successfully." };
};

/**
 * Creates a reply on a discussion.
 * Increments replyCount. Rejects if the discussion is locked.
 */
const createReply = async (
  discussionId: string,
  data: CreateReplyInput,
  userId: string,
) => {
  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId, isDeleted: false },
  });

  if (!discussion) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  if (discussion.isLocked) {
    throw new AppError(status.FORBIDDEN, "This discussion is locked. No new replies allowed.");
  }

  // Validate parent reply if provided
  if (data.parentId) {
    const parentReply = await prisma.discussionReply.findUnique({
      where: { id: data.parentId, discussionId },
    });

    if (!parentReply) {
      throw new AppError(status.NOT_FOUND, "Parent reply not found.");
    }
  }

  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.discussionReply.create({
      data: {
        content: data.content,
        discussionId,
        authorId: userId,
        parentId: data.parentId ?? null,
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    await tx.discussion.update({
      where: { id: discussionId },
      data: { replyCount: { increment: 1 } },
    });

    return created;
  });

  // Notify discussion author (skip self-reply)
  if (discussion.authorId !== userId) {
    notificationService.createNotification({
      userId: discussion.authorId,
      type: "DISCUSSION_REPLY",
      title: "New Reply",
      message: `Someone replied to a discussion.`,
      link: `/discussions/${discussionId}`,
    }).catch(() => {});
  }

  // Award reputation points for posting a reply (non-blocking)
  gamificationService
    .awardPoints({
      userId,
      event: "REPLY_POSTED",
      reason: `Replied to discussion`,
      source: `DISCUSSION:${discussionId}`,
    })
    .catch(() => {});

  // Broadcast new reply to all connected clients (non-blocking)
  try {
    const io = getSocketServer();
    io.emit("discussion:reply", {
      discussionId,
      reply: {
        id: reply.id,
        content: reply.content,
        authorId: reply.authorId,
        author: reply.author,
        parentId: reply.parentId,
        createdAt: reply.createdAt,
      },
    });
  } catch {
    // Non-critical: ignore socket failures
  }

  return reply;
};

/**
 * Soft deletes a reply. Only the reply author or discussion author can delete.
 * Decrements replyCount.
 */
const deleteReply = async (replyId: string, userId: string) => {
  const reply = await prisma.discussionReply.findUnique({
    where: { id: replyId, isDeleted: false },
    include: { discussion: { select: { authorId: true } } },
  });

  if (!reply) {
    throw new AppError(status.NOT_FOUND, "Reply not found.");
  }

  if (reply.authorId !== userId && reply.discussion.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own replies.");
  }

  await prisma.$transaction(async (tx) => {
    await softDelete(tx.discussionReply, replyId);

    await tx.discussion.update({
      where: { id: reply.discussionId },
      data: { replyCount: { decrement: 1 } },
    });
  });

  gamificationService
    .handleContentDeleted("DISCUSSION", reply.discussionId, reply.authorId)
    .catch(() => {});

  return { message: "Reply deleted successfully." };
};

/**
 * Toggles a vote on a discussion.
 * Same vote type = remove vote, different = update vote, no vote = add vote.
 * Self-voting is not allowed. Updates upvoteCount atomically.
 */
const voteDiscussion = async (
  discussionId: string,
  userId: string,
  input: VoteInput,
) => {
  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId, isDeleted: false },
  });

  if (!discussion) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  if (discussion.authorId === userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot vote on your own discussion.");
  }

  const ownerId = discussion.authorId;
  const awardVote = (voteType: VoteType) => {
    if (userId === ownerId) return Promise.resolve();
    return voteType === VoteType.UP
      ? gamificationService.handleUpvote(userId, ownerId, "DISCUSSION", discussionId)
      : gamificationService.handleDownvote(userId, ownerId, "DISCUSSION", discussionId);
  };
  const reverseVote = (voteType: VoteType) => {
    if (userId === ownerId) return Promise.resolve();
    return gamificationService.handleVoteReversal(
      userId,
      ownerId,
      "DISCUSSION",
      discussionId,
      voteType === VoteType.UP ? "UP" : "DOWN",
    );
  };

  const existingVote = await prisma.discussionVote.findUnique({
    where: { discussionId_userId: { discussionId, userId } },
  });

  if (existingVote) {
    if (existingVote.type === input.type) {
      // Remove vote
      const counts = await prisma.$transaction(async (tx) => {
        await tx.discussionVote.delete({ where: { id: existingVote.id } });
        if (input.type === VoteType.UP) {
          await tx.discussion.update({
            where: { id: discussionId },
            data: { upvoteCount: { decrement: 1 } },
          });
        }
        return tx.discussion.findUnique({
          where: { id: discussionId },
          select: { upvoteCount: true },
        });
      });

      await reverseVote(existingVote.type).catch(() => {});

      return { action: "removed", upvoteCount: counts!.upvoteCount };
    }

    // Update vote
    const counts = await prisma.$transaction(async (tx) => {
      await tx.discussionVote.update({
        where: { id: existingVote.id },
        data: { type: input.type },
      });
      if (input.type === VoteType.UP) {
        await tx.discussion.update({
          where: { id: discussionId },
          data: { upvoteCount: { increment: 1 } },
        });
      } else {
        await tx.discussion.update({
          where: { id: discussionId },
          data: { upvoteCount: { decrement: 1 } },
        });
      }
      return tx.discussion.findUnique({
        where: { id: discussionId },
        select: { upvoteCount: true },
      });
    });

    await reverseVote(existingVote.type).catch(() => {});
    await awardVote(input.type).catch(() => {});

    return { action: "updated", upvoteCount: counts!.upvoteCount };
  }

  // Add new vote
  const counts = await prisma.$transaction(async (tx) => {
    await tx.discussionVote.create({
      data: { discussionId, userId, type: input.type },
    });
    if (input.type === VoteType.UP) {
      await tx.discussion.update({
        where: { id: discussionId },
        data: { upvoteCount: { increment: 1 } },
      });
    }
    return tx.discussion.findUnique({
      where: { id: discussionId },
      select: { upvoteCount: true },
    });
  });

  await awardVote(input.type).catch(() => {});

  return { action: "added", upvoteCount: counts!.upvoteCount };
};

/**
 * Toggles a vote on a reply.
 * Same vote type = remove, different = update, no vote = add.
 * Updates reply upvoteCount atomically.
 */
const voteReply = async (replyId: string, userId: string, input: VoteInput) => {
  const reply = await prisma.discussionReply.findUnique({
    where: { id: replyId, isDeleted: false },
  });

  if (!reply) {
    throw new AppError(status.NOT_FOUND, "Reply not found.");
  }

  if (reply.authorId === userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot vote on your own reply.");
  }

  const existingVote = await prisma.discussionReplyVote.findUnique({
    where: { replyId_userId: { replyId, userId } },
  });

  if (existingVote) {
    if (existingVote.type === input.type) {
      // Remove vote
      const counts = await prisma.$transaction(async (tx) => {
        await tx.discussionReplyVote.delete({ where: { id: existingVote.id } });
        if (input.type === VoteType.UP) {
          await tx.discussionReply.update({
            where: { id: replyId },
            data: { upvoteCount: { decrement: 1 } },
          });
        }
        return tx.discussionReply.findUnique({
          where: { id: replyId },
          select: { upvoteCount: true },
        });
      });

      return { action: "removed", upvoteCount: counts!.upvoteCount };
    }

    // Update vote
    const counts = await prisma.$transaction(async (tx) => {
      await tx.discussionReplyVote.update({
        where: { id: existingVote.id },
        data: { type: input.type },
      });
      if (input.type === VoteType.UP) {
        await tx.discussionReply.update({
          where: { id: replyId },
          data: { upvoteCount: { increment: 1 } },
        });
      } else {
        await tx.discussionReply.update({
          where: { id: replyId },
          data: { upvoteCount: { decrement: 1 } },
        });
      }
      return tx.discussionReply.findUnique({
        where: { id: replyId },
        select: { upvoteCount: true },
      });
    });

    return { action: "updated", upvoteCount: counts!.upvoteCount };
  }

  // Add new vote
  const counts = await prisma.$transaction(async (tx) => {
    await tx.discussionReplyVote.create({
      data: { replyId, userId, type: input.type },
    });
    if (input.type === VoteType.UP) {
      await tx.discussionReply.update({
        where: { id: replyId },
        data: { upvoteCount: { increment: 1 } },
      });
    }
    return tx.discussionReply.findUnique({
      where: { id: replyId },
      select: { upvoteCount: true },
    });
  });

  return { action: "added", upvoteCount: counts!.upvoteCount };
};

/**
 * Toggles a bookmark on a discussion.
 */
const bookmarkDiscussion = async (discussionId: string, userId: string) => {
  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId, isDeleted: false },
  });

  if (!discussion) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  const existingBookmark = await prisma.discussionBookmark.findUnique({
    where: { discussionId_userId: { discussionId, userId } },
  });

  if (existingBookmark) {
    await prisma.discussionBookmark.delete({
      where: { id: existingBookmark.id },
    });
    return { action: "removed" };
  }

  await prisma.discussionBookmark.create({
    data: { discussionId, userId },
  });

  return { action: "added" };
};

/**
 * Toggles pin status. Admin only.
 */
const pinDiscussion = async (id: string) => {
  const existing = await prisma.discussion.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  const updated = await prisma.discussion.update({
    where: { id },
    data: { isPinned: !existing.isPinned },
  });

  return { isPinned: updated.isPinned };
};

/**
 * Toggles lock status. Admin only.
 */
const lockDiscussion = async (id: string) => {
  const existing = await prisma.discussion.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  const updated = await prisma.discussion.update({
    where: { id },
    data: { isLocked: !existing.isLocked },
  });

  return { isLocked: updated.isLocked };
};

/**
 * Toggles solved status. Only the discussion author can mark as solved.
 */
const markSolved = async (discussionId: string, userId: string) => {
  const existing = await prisma.discussion.findUnique({
    where: { id: discussionId, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  if (existing.authorId !== userId) {
    throw new AppError(status.FORBIDDEN, "Only the author can mark a discussion as solved.");
  }

  const updated = await prisma.discussion.update({
    where: { id: discussionId },
    data: { isSolved: !existing.isSolved },
  });

  return { isSolved: updated.isSolved };
};

/**
 * Gets all bookmarked discussions for a user.
 */
const getBookmarkedDiscussions = async (userId: string, page = 1, limit = 12) => {
  const skip = (page - 1) * limit;

  const [bookmarks, total] = await prisma.$transaction([
    prisma.discussionBookmark.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        discussion: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            author: { select: { id: true, name: true, image: true } },
            _count: { select: { discussionReplies: true } },
          },
        },
      },
    }),
    prisma.discussionBookmark.count({ where: { userId } }),
  ]);

  return {
    data: bookmarks.map((b) => b.discussion),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Lists all discussion categories with their discussion counts.
 */
const listCategories = async () => {
  const categories = await prisma.discussionCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { discussions: true } } },
  });
  return categories;
};

/**
 * Lists all tags with their discussion usage counts.
 * Discussion tags reuse the shared Tag model.
 */
const listTags = async () => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { discussionTags: true } } },
  });
  return tags;
};

/**
 * Returns the top trending discussions by recent activity (latest replies / views).
 */
const getTrending = async (limit = 3) => {
  const discussions = await prisma.discussion.findMany({
    where: { isDeleted: false, visibility: "PUBLIC" },
    orderBy: [{ viewCount: "desc" }, { replyCount: "desc" }],
    take: limit,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { discussionReplies: true } },
    },
  });
  return discussions;
};

/**
 * Returns top contributors ranked by number of discussions authored.
 */
const getTopContributors = async (limit = 5) => {
  const authors = await prisma.discussion.groupBy({
    by: ["authorId"],
    _count: { _all: true },
    orderBy: { _count: { authorId: "desc" } },
    take: limit,
  });

  const userIds = authors.map((a) => a.authorId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: { id: true, name: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return authors
    .map((entry, index) => ({
      rank: index + 1,
      name: userMap.get(entry.authorId)?.name ?? "Unknown",
      image: userMap.get(entry.authorId)?.image ?? null,
      discussionCount: entry._count._all,
    }))
    .filter((entry) => entry.name !== "Unknown");
};

/**
 * Returns discussions authored by the current user.
 */
const getMyDiscussions = async (userId: string, page = 1, limit = 12) => {
  const skip = (page - 1) * limit;
  const [discussions, total] = await prisma.$transaction([
    prisma.discussion.findMany({
      where: { authorId: userId, isDeleted: false },
      skip,
      take: limit,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { discussionReplies: true } },
      },
    }),
    prisma.discussion.count({ where: { authorId: userId, isDeleted: false } }),
  ]);
  return {
    data: discussions,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Returns discussions the current user has replied to.
 */
const getMyReplies = async (userId: string, page = 1, limit = 12) => {
  const skip = (page - 1) * limit;

  const replyDiscussionIds = await prisma.discussionReply.findMany({
    where: { authorId: userId, isDeleted: false },
    select: { discussionId: true },
    distinct: ["discussionId"],
  });
  const ids = replyDiscussionIds.map((r) => r.discussionId);

  const [discussions, total] = await prisma.$transaction([
    prisma.discussion.findMany({
      where: { id: { in: ids }, isDeleted: false },
      skip,
      take: limit,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { discussionReplies: true } },
      },
    }),
    prisma.discussion.count({ where: { id: { in: ids }, isDeleted: false } }),
  ]);
  return {
    data: discussions,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Lists replies for a discussion with pagination and sorting.
 * Returns top-level replies with nested children (1 level).
 */
const listReplies = async (
  discussionId: string,
  userId: string,
  query: import("./discussion.interface").ListRepliesQuery = {},
) => {
  const { page = 1, limit = 20, sort = "newest" } = query;
  const skip = (page - 1) * limit;

  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId, isDeleted: false },
  });

  if (!discussion) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  await checkVisibility(discussion.authorId, discussion.visibility, userId);

  const where = { discussionId, parentId: null as string | null, isDeleted: false };

  let orderBy: Record<string, unknown>[];
  switch (sort) {
    case "upvotes":
      orderBy = [{ upvoteCount: "desc" }, { createdAt: "desc" }];
      break;
    case "oldest":
      orderBy = [{ createdAt: "asc" }];
      break;
    case "newest":
    default:
      orderBy = [{ createdAt: "desc" }];
      break;
  }

  const [replies, total] = await prisma.$transaction([
    prisma.discussionReply.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        replies: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    }),
    prisma.discussionReply.count({ where }),
  ]);

  let repliesWithVotes = replies;

  if (userId) {
    const replyIds = replies.flatMap((r) => [r.id, ...r.replies.map((c) => c.id)]);
    const votes = await prisma.discussionReplyVote.findMany({
      where: { replyId: { in: replyIds }, userId },
      select: { replyId: true, type: true },
    });
    const voteMap = new Map(votes.map((v) => [v.replyId, v.type]));

    repliesWithVotes = replies.map((r) => ({
      ...r,
      userVote: voteMap.get(r.id) ?? null,
      replies: r.replies.map((c) => ({
        ...c,
        userVote: voteMap.get(c.id) ?? null,
      })),
    }));
  }

  return {
    replies: repliesWithVotes,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const discussionService = {
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
