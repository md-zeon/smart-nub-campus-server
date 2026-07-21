import status from "http-status";
import { VoteType } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
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
    tag,
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

  if (tag) {
    where.resourceTags = {
      some: {
        tag: { slug: tag },
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

  await prisma.$transaction(async (tx) => {
    const updated = await tx.resource.update({
      where: { id },
      data: updateData,
    });

    if (data.tags) {
      await tx.resourceTag.deleteMany({ where: { resourceId: id } });

      for (const tagName of data.tags) {
        const slug = tagName.toLowerCase().replace(/\s+/g, "-");
        const tag = await tx.tag.upsert({
          where: { slug },
          update: {},
          create: { name: tagName, slug },
        });
        await tx.resourceTag.create({
          data: { resourceId: id, tagId: tag.id },
        });
      }
    }

    return updated;
  });

  return prisma.resource.findUnique({
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

  return comment;
};

const getComments = async (resourceId: string) => {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId, isDeleted: false },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  const comments = await prisma.comment.findMany({
    where: {
      resourceId,
      isDeleted: false,
      parentId: null,
    },
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
  });

  return comments;
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
    data: { isDeleted: true },
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

  return updated;
};

export const resourceService = {
  createResource,
  getResourceById,
  listResources,
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
