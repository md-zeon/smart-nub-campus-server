import status from "http-status";
import { VoteType } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { getSocketServer } from "../../lib/socket/socket-server";
import { gamificationService } from "../gamification/gamification.service";
import { notificationService } from "../notification/notification.service";
import {
  CreateResourceInput,
  CreateCommentInput,
  ListResourcesQuery,
  ReportResourceInput,
  ReviewReportInput,
  ToggleVoteResult,
  ToggleBookmarkResult,
  UpdateResourceInput,
} from "./resource.interface";

const createResource = async (data: CreateResourceInput, userId: string) => {
  const resource = await prisma.resource.create({
    data: {
      title: data.title,
      description: data.description,
      fileUrl: data.fileUrl,
      filePublicId: data.filePublicId ?? null,
      fileType: data.fileType,
      fileSize: data.fileSize,
      courseId: data.courseId,
      categoryId: data.categoryId,
      uploaderId: userId,
      resourceTags: {
        create: await Promise.all(
          data.tags.map(async (tagName) => {
            const slug = tagName.toLowerCase().replace(/\s+/g, "-");
            const tag = await prisma.tag.upsert({
              where: { slug },
              update: {},
              create: { name: tagName, slug },
            });
            return { tagId: tag.id };
          }),
        ),
      },
    },
    include: {
      course: true,
      category: true,
      uploader: {
        select: { id: true, name: true, email: true, image: true },
      },
      resourceTags: { include: { tag: true } },
    },
  });

  // Award reputation points for uploading a resource (non-blocking)
  gamificationService
    .awardPoints({
      userId,
      event: "RESOURCE_UPLOADED",
      reason: `Uploaded resource: ${data.title}`,
      source: `RESOURCE:${resource.id}`,
    })
    .catch(() => {
      // Non-critical: ignore gamification failures
    });

  // Broadcast new resource to all connected clients (non-blocking)
  try {
    const io = getSocketServer();
    io.emit("resource:new", {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      fileUrl: resource.fileUrl,
      fileType: resource.fileType,
      fileSize: resource.fileSize,
      courseId: resource.courseId,
      categoryId: resource.categoryId,
      uploaderId: userId,
      createdAt: resource.createdAt.toISOString(),
    });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  return resource;
};

const getResourceById = async (id: string, userId?: string) => {
  const resource = await prisma.resource.findUnique({
    where: { id, isDeleted: false },
    include: {
      course: true,
      category: true,
      uploader: {
        select: { id: true, name: true, email: true, image: true },
      },
      resourceTags: { include: { tag: true } },
      _count: {
        select: {
          resourceVotes: true,
          comments: true,
          resourceBookmarks: true,
        },
      },
    },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  await prisma.resource.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  let userVote: VoteType | null = null;
  let isBookmarked = false;

  if (userId) {
    const vote = await prisma.resourceVote.findUnique({
      where: { resourceId_userId: { resourceId: id, userId } },
      select: { type: true },
    });
    userVote = vote?.type ?? null;

    const bookmark = await prisma.resourceBookmark.findUnique({
      where: { resourceId_userId: { resourceId: id, userId } },
      select: { id: true },
    });
    isBookmarked = !!bookmark;
  }

  return {
    ...resource,
    viewCount: resource.viewCount + 1,
    userVote,
    isBookmarked,
  };
};

const listResources = async (query: ListResourcesQuery, userId?: string) => {
  const {
    courseId,
    categoryId,
    tags,
    search,
    sort = "newest",
    page = 1,
    limit = 12,
  } = query;

  const skip = (page - 1) * limit;
  const take = limit;

  const where: Record<string, unknown> = { isDeleted: false };

  if (courseId) where.courseId = courseId;
  if (categoryId) where.categoryId = categoryId;

  if (tags && tags.length > 0) {
    where.resourceTags = {
      some: {
        tag: { slug: { in: tags } },
      },
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Record<string, string>;
  switch (sort) {
    case "popular":
      orderBy = { upvoteCount: "desc" };
      break;
    case "downloads":
      orderBy = { downloadCount: "desc" };
      break;
    case "newest":
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  const [resources, total] = await prisma.$transaction([
    prisma.resource.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        course: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
        uploader: {
          select: { id: true, name: true, image: true },
        },
        resourceTags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    }),
    prisma.resource.count({ where }),
  ]);

  let resourcesWithUserState = resources;

  if (userId) {
    const resourceIds = resources.map((r) => r.id);

    const [votes, bookmarks] = await Promise.all([
      prisma.resourceVote.findMany({
        where: { resourceId: { in: resourceIds }, userId },
        select: { resourceId: true, type: true },
      }),
      prisma.resourceBookmark.findMany({
        where: { resourceId: { in: resourceIds }, userId },
        select: { resourceId: true },
      }),
    ]);

    const voteMap = new Map(votes.map((v) => [v.resourceId, v.type]));
    const bookmarkSet = new Set(bookmarks.map((b) => b.resourceId));

    resourcesWithUserState = resources.map((r) => ({
      ...r,
      userVote: voteMap.get(r.id) ?? null,
      isBookmarked: bookmarkSet.has(r.id),
    }));
  }

  return {
    data: resourcesWithUserState,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const updateResource = async (
  id: string,
  data: UpdateResourceInput,
  userId: string,
) => {
  const existing = await prisma.resource.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  if (existing.uploaderId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only edit your own resources.");
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

  return prisma.$transaction(async (tx) => {
    await tx.resource.update({
      where: { id },
      data: updateData,
    });

    if (data.tags) {
      await tx.resourceTag.deleteMany({ where: { resourceId: id } });

      const tagResults = await Promise.all(
        data.tags.map((tagName) => {
          const slug = tagName.toLowerCase().replace(/\s+/g, "-");
          return tx.tag.upsert({
            where: { slug },
            update: {},
            create: { name: tagName, slug },
          });
        }),
      );

      await tx.resourceTag.createMany({
        data: tagResults.map((tag) => ({ resourceId: id, tagId: tag.id })),
      });
    }

    return tx.resource.findUnique({
      where: { id },
      include: {
        course: true,
        category: true,
        uploader: {
          select: { id: true, name: true, email: true, image: true },
        },
        resourceTags: { include: { tag: true } },
      },
    });
  });
};

const deleteResource = async (id: string, userId: string) => {
  const existing = await prisma.resource.findUnique({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  if (existing.uploaderId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own resources.");
  }

  await prisma.resource.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  // Reverse reputation points awarded for this resource (non-blocking)
  gamificationService
    .handleContentDeleted("RESOURCE", id, existing.uploaderId)
    .catch(() => {
      // Non-critical: ignore gamification failures
    });

  return { message: "Resource deleted successfully." };
};

const toggleVote = async (
  resourceId: string,
  userId: string,
  type: VoteType,
): Promise<ToggleVoteResult> => {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId, isDeleted: false },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  const existingVote = await prisma.resourceVote.findUnique({
    where: { resourceId_userId: { resourceId, userId } },
  });

  // Award/remove reputation points for the resource owner (skip self-votes).
  // Non-blocking — gamification failures must not break voting.
  const ownerId = resource.uploaderId;
  const awardVote = (voteType: VoteType) => {
    if (userId === ownerId) return Promise.resolve();
    return voteType === VoteType.UP
      ? gamificationService.handleUpvote(userId, ownerId, "RESOURCE", resourceId)
      : gamificationService.handleDownvote(userId, ownerId, "RESOURCE", resourceId);
  };
  const reverseVote = (voteType: VoteType) => {
    if (userId === ownerId) return Promise.resolve();
    return gamificationService.handleVoteReversal(
      userId,
      ownerId,
      "RESOURCE",
      resourceId,
      voteType === VoteType.UP ? "UP" : "DOWN",
    );
  };

  if (existingVote) {
    if (existingVote.type === type) {
      await prisma.$transaction(async (tx) => {
        await tx.resourceVote.delete({
          where: { id: existingVote.id },
        });

        const decrementField = type === VoteType.UP ? "upvoteCount" : "downvoteCount";
        await tx.resource.update({
          where: { id: resourceId },
          data: { [decrementField]: { decrement: 1 } },
        });
      });

      const updated = await prisma.resource.findUnique({
        where: { id: resourceId },
        select: { upvoteCount: true, downvoteCount: true },
      });

      await reverseVote(existingVote.type).catch(() => {});

      return {
        action: "removed",
        upvoteCount: updated!.upvoteCount,
        downvoteCount: updated!.downvoteCount,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.resourceVote.update({
        where: { id: existingVote.id },
        data: { type },
      });

      if (type === VoteType.UP) {
        await tx.resource.update({
          where: { id: resourceId },
          data: {
            upvoteCount: { increment: 1 },
            downvoteCount: { decrement: 1 },
          },
        });
      } else {
        await tx.resource.update({
          where: { id: resourceId },
          data: {
            upvoteCount: { decrement: 1 },
            downvoteCount: { increment: 1 },
          },
        });
      }
    });

    const updated = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { upvoteCount: true, downvoteCount: true },
    });

    await reverseVote(existingVote.type).catch(() => {});
    await awardVote(type).catch(() => {});

    return {
      action: "updated",
      upvoteCount: updated!.upvoteCount,
      downvoteCount: updated!.downvoteCount,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.resourceVote.create({
      data: { resourceId, userId, type },
    });

    const incrementField = type === VoteType.UP ? "upvoteCount" : "downvoteCount";
    await tx.resource.update({
      where: { id: resourceId },
      data: { [incrementField]: { increment: 1 } },
    });
  });

  const updated = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { upvoteCount: true, downvoteCount: true },
  });

  await awardVote(type).catch(() => {});

  // Notify resource owner on UP vote (skip self-votes)
  if (type === VoteType.UP && userId !== ownerId) {
    notificationService.createNotification({
      userId: ownerId,
      type: "RESOURCE_UPVOTE",
      title: "Resource Upvoted",
      message: `Someone upvoted your resource.`,
      link: `/resources/${resourceId}`,
    }).catch(() => {});
  }

  return {
    action: "added",
    upvoteCount: updated!.upvoteCount,
    downvoteCount: updated!.downvoteCount,
  };
};

const toggleBookmark = async (
  resourceId: string,
  userId: string,
): Promise<ToggleBookmarkResult> => {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId, isDeleted: false },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  const existingBookmark = await prisma.resourceBookmark.findUnique({
    where: { resourceId_userId: { resourceId, userId } },
  });

  if (existingBookmark) {
    await prisma.resourceBookmark.delete({
      where: { id: existingBookmark.id },
    });
    return { action: "removed" };
  }

  await prisma.resourceBookmark.create({
    data: { resourceId, userId },
  });

  return { action: "added" };
};

const trackDownload = async (resourceId: string, userId: string) => {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId, isDeleted: false },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.resourceDownload.create({
      data: { resourceId, userId },
    });

    await tx.resource.update({
      where: { id: resourceId },
      data: { downloadCount: { increment: 1 } },
    });
  });

  return { fileUrl: resource.fileUrl, filePublicId: resource.filePublicId };
};

const addComment = async (
  resourceId: string,
  userId: string,
  data: CreateCommentInput,
) => {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId, isDeleted: false },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  if (data.parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: data.parentId, resourceId, isDeleted: false },
    });

    if (!parentComment) {
      throw new AppError(status.NOT_FOUND, "Parent comment not found.");
    }
  }

  const comment = await prisma.comment.create({
    data: {
      content: data.content,
      resourceId,
      userId,
      parentId: data.parentId ?? null,
    },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  // Notify resource owner on comment (skip self-comments)
  if (userId !== resource.uploaderId) {
    notificationService.createNotification({
      userId: resource.uploaderId,
      type: "RESOURCE_COMMENT",
      title: "New Comment",
      message: `Someone commented on your resource.`,
      link: `/resources/${resourceId}`,
    }).catch(() => {});
  }

  return comment;
};

const getComments = async (resourceId: string, page = 1, limit = 20) => {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId, isDeleted: false },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  const skip = (page - 1) * limit;
  const where = {
    resourceId,
    isDeleted: false,
    parentId: null as string | null,
  };

  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        replies: {
          where: { isDeleted: false },
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.comment.count({ where }),
  ]);

  return {
    comments,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const deleteComment = async (id: string, userId: string) => {
  const comment = await prisma.comment.findUnique({
    where: { id, isDeleted: false },
  });

  if (!comment) {
    throw new AppError(status.NOT_FOUND, "Comment not found.");
  }

  if (comment.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own comments.");
  }

  await prisma.comment.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return { message: "Comment deleted successfully." };
};

const reportResource = async (
  resourceId: string,
  userId: string,
  reason: ReportResourceInput["reason"],
  description?: string,
) => {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId, isDeleted: false },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  const existingReport = await prisma.resourceReport.findUnique({
    where: { resourceId_userId: { resourceId, userId } },
  });

  if (existingReport) {
    throw new AppError(status.CONFLICT, "You have already reported this resource.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.resourceReport.create({
      data: {
        resourceId,
        userId,
        reason,
        description: description ?? null,
      },
    });

    await tx.resource.update({
      where: { id: resourceId },
      data: { reportCount: { increment: 1 } },
    });
  });

  return { message: "Report submitted successfully." };
};

const getReports = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [reports, total] = await prisma.$transaction([
    prisma.resourceReport.findMany({
      where: { status: "PENDING" },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        resource: {
          select: { id: true, title: true, fileType: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.resourceReport.count({ where: { status: "PENDING" } }),
  ]);

  return {
    data: reports,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const reviewReport = async (
  id: string,
  reviewedById: string,
  reviewStatus: ReviewReportInput["status"],
) => {
  const report = await prisma.resourceReport.findUnique({
    where: { id },
  });

  if (!report) {
    throw new AppError(status.NOT_FOUND, "Report not found.");
  }

  if (report.status !== "PENDING") {
    throw new AppError(status.BAD_REQUEST, "Only pending reports can be reviewed.");
  }

  const updated = await prisma.resourceReport.update({
    where: { id },
    data: {
      status: reviewStatus,
      reviewedById,
      reviewedAt: new Date(),
    },
  });

  // Notify the reporter that their report was reviewed (non-blocking)
  if (report.userId !== reviewedById) {
    notificationService.createNotification({
      userId: report.userId,
      type: "RESOURCE_REPORT_REVIEWED",
      title: "Report Reviewed",
      message: `Your report has been ${reviewStatus.toLowerCase().replace(/_/g, " ")}.`,
      link: `/resources/${report.resourceId}`,
    }).catch(() => {});
  }

  return updated;
};

const listCategories = async () => {
  const categories = await prisma.resourceCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { resources: true } } },
  });
  return categories;
};

const listCourses = async () => {
  const courses = await prisma.course.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { resources: true } } },
  });
  return courses;
};

const listTags = async () => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { resourceTags: true } } },
  });
  return tags;
};

export const resourceService = {
  createResource,
  getResourceById,
  listResources,
  listCategories,
  listCourses,
  listTags,
  updateResource,
  deleteResource,
  toggleVote,
  toggleBookmark,
  trackDownload,
  addComment,
  getComments,
  deleteComment,
  reportResource,
  getReports,
  reviewReport,
};
