import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StatusCodes } from "http-status-codes";
import { VoteType } from "../../../../generated/prisma/enums";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    resource: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    tag: { upsert: vi.fn() },
    resourceTag: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    resourceVote: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    resourceBookmark: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    resourceDownload: { create: vi.fn() },
    comment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    resourceReport: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    resourceCategory: { findMany: vi.fn() },
    course: { findMany: vi.fn() },
    $transaction: vi.fn(async (fns: any) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      return fns((...args: any[]) => args[args.length - 1]);
    }),
  },
}));

vi.mock("../../gamification/gamification.service", () => ({
  gamificationService: {
    awardPoints: vi.fn().mockResolvedValue(undefined),
    handleContentDeleted: vi.fn().mockResolvedValue(undefined),
    handleUpvote: vi.fn().mockResolvedValue(undefined),
    handleDownvote: vi.fn().mockResolvedValue(undefined),
    handleVoteReversal: vi.fn().mockResolvedValue(undefined),
  },
}));

import { resourceService } from "../resource.service";
import { prisma } from "../../../../app/lib/prisma";
import { gamificationService } from "../../gamification/gamification.service";

const mockedPrisma = vi.mocked(prisma);
const mockedGamification = vi.mocked(gamificationService);

describe("resourceService", () => {
  const userId = "user-001";
  const resourceId = "resource-001";

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createResource", () => {
    it("creates a resource with tags", async () => {
      const mockTag = { id: "tag-001", name: "JavaScript", slug: "javascript", createdAt: new Date(), updatedAt: new Date() };
      const mockCreated = { id: resourceId, title: "Test", uploaderId: userId };

      (mockedPrisma.tag.upsert as any).mockResolvedValue(mockTag);
      (mockedPrisma.resource.create as any).mockResolvedValue(mockCreated);

      const result = await resourceService.createResource(
        {
          title: "Test",
          description: "desc",
          fileUrl: "https://example.com/file.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          courseId: "course-001",
          categoryId: "cat-001",
          tags: ["JavaScript"],
        },
        userId,
      );

      expect(result).toEqual(mockCreated);
      expect(mockedPrisma.resource.create).toHaveBeenCalledOnce();
      expect(mockedPrisma.tag.upsert).toHaveBeenCalledOnce();
    });

    it("awards gamification points on creation", async () => {
      (mockedPrisma.tag.upsert as any).mockResolvedValue({ id: "t1", name: "JS", slug: "js", createdAt: new Date(), updatedAt: new Date() });
      (mockedPrisma.resource.create as any).mockResolvedValue({ id: resourceId, title: "Test" });

      await resourceService.createResource(
        {
          title: "Test",
          fileUrl: "https://example.com/file.pdf",
          fileType: "application/pdf",
          fileSize: 1024,
          courseId: "c1",
          categoryId: "cat1",
          tags: [],
        },
        userId,
      );

      expect(mockedGamification.awardPoints).toHaveBeenCalledWith(
        expect.objectContaining({ userId, event: "RESOURCE_UPLOADED" }),
      );
    });
  });

  describe("getResourceById", () => {
    it("returns resource with vote and bookmark state", async () => {
      const mockResource = { id: resourceId, viewCount: 5 };
      (mockedPrisma.resource.findUnique as any)
        .mockResolvedValueOnce(mockResource)
        .mockResolvedValueOnce({ upvoteCount: 6, downvoteCount: 1 });
      (mockedPrisma.resourceVote.findUnique as any).mockResolvedValue({ type: VoteType.UP });
      (mockedPrisma.resourceBookmark.findUnique as any).mockResolvedValue({ id: "bm1" });
      (mockedPrisma.resource.update as any).mockResolvedValue({});

      const result = await resourceService.getResourceById(resourceId, userId);
      expect(result.userVote).toBe(VoteType.UP);
      expect(result.isBookmarked).toBe(true);
      expect(result.viewCount).toBe(6);
    });

    it("throws NOT_FOUND for missing resource", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue(null);
      await expect(resourceService.getResourceById("nonexistent")).rejects.toThrow("Resource not found.");
    });
  });

  describe("listResources", () => {
    it("returns paginated results", async () => {
      const mockResources = [{ id: "r1" }, { id: "r2" }];
      (mockedPrisma.$transaction as any).mockResolvedValue([mockResources, 2]);
      (mockedPrisma.resourceVote.findMany as any).mockResolvedValue([]);
      (mockedPrisma.resourceBookmark.findMany as any).mockResolvedValue([]);

      const result = await resourceService.listResources({ page: 1, limit: 12 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe("updateResource", () => {
    it("updates own resource", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId, uploaderId: userId });
      (mockedPrisma.$transaction as any).mockImplementation(async (fn: any) => fn({ resource: { update: vi.fn().mockResolvedValue({}) }, resourceTag: { deleteMany: vi.fn() }, tag: { upsert: vi.fn() }, resourceTagCreate: { create: vi.fn() } }));
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId });

      const result = await resourceService.updateResource(resourceId, { title: "Updated" }, userId);
      expect(result).toBeDefined();
    });

    it("throws FORBIDDEN when editing others resource", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId, uploaderId: "other-user" });
      await expect(resourceService.updateResource(resourceId, { title: "X" }, userId)).rejects.toThrow("You can only edit your own resources.");
    });

    it("throws NOT_FOUND for nonexistent resource", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue(null);
      await expect(resourceService.updateResource("bad-id", { title: "X" }, userId)).rejects.toThrow("Resource not found.");
    });
  });

  describe("deleteResource", () => {
    it("soft-deletes own resource", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId, uploaderId: userId });
      (mockedPrisma.resource.update as any).mockResolvedValue({});

      const result = await resourceService.deleteResource(resourceId, userId);
      expect(result.message).toBe("Resource deleted successfully.");
      expect(mockedPrisma.resource.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isDeleted: true }) }),
      );
    });

    it("throws FORBIDDEN for non-owner", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId, uploaderId: "other" });
      await expect(resourceService.deleteResource(resourceId, userId)).rejects.toThrow("You can only delete your own resources.");
    });
  });

  describe("toggleVote", () => {
    it("adds new upvote", async () => {
      (mockedPrisma.resource.findUnique as any)
        .mockResolvedValueOnce({ id: resourceId, uploaderId: "owner" })
        .mockResolvedValueOnce({ upvoteCount: 1, downvoteCount: 0 });
      (mockedPrisma.resourceVote.findUnique as any).mockResolvedValue(null);
      (mockedPrisma.$transaction as any).mockImplementation(async (fn: any) => fn({
        resourceVote: { create: vi.fn() },
        resource: { update: vi.fn() },
      }));

      const result = await resourceService.toggleVote(resourceId, userId, VoteType.UP);
      expect(result.action).toBe("added");
    });

    it("removes existing vote when same type", async () => {
      (mockedPrisma.resource.findUnique as any)
        .mockResolvedValueOnce({ id: resourceId, uploaderId: "owner" })
        .mockResolvedValueOnce({ upvoteCount: 0, downvoteCount: 0 });
      (mockedPrisma.resourceVote.findUnique as any).mockResolvedValue({ id: "v1", type: VoteType.UP });
      (mockedPrisma.$transaction as any).mockImplementation(async (fn: any) => fn({
        resourceVote: { delete: vi.fn() },
        resource: { update: vi.fn() },
      }));

      const result = await resourceService.toggleVote(resourceId, userId, VoteType.UP);
      expect(result.action).toBe("removed");
    });

    it("throws NOT_FOUND for nonexistent resource", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue(null);
      await expect(resourceService.toggleVote("bad", userId, VoteType.UP)).rejects.toThrow("Resource not found.");
    });
  });

  describe("toggleBookmark", () => {
    it("adds bookmark", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId });
      (mockedPrisma.resourceBookmark.findUnique as any).mockResolvedValue(null);
      (mockedPrisma.resourceBookmark.create as any).mockResolvedValue({});

      const result = await resourceService.toggleBookmark(resourceId, userId);
      expect(result.action).toBe("added");
    });

    it("removes existing bookmark", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId });
      (mockedPrisma.resourceBookmark.findUnique as any).mockResolvedValue({ id: "bm1" });
      (mockedPrisma.resourceBookmark.delete as any).mockResolvedValue({});

      const result = await resourceService.toggleBookmark(resourceId, userId);
      expect(result.action).toBe("removed");
    });
  });

  describe("addComment", () => {
    it("adds a comment to a resource", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId });
      (mockedPrisma.comment.create as any).mockResolvedValue({ id: "c1", content: "Great!" });

      const result = await resourceService.addComment(resourceId, userId, { content: "Great!" });
      expect(result.content).toBe("Great!");
    });

    it("throws NOT_FOUND for missing resource", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue(null);
      await expect(resourceService.addComment("bad", userId, { content: "x" })).rejects.toThrow("Resource not found.");
    });

    it("validates parent comment exists", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId });
      (mockedPrisma.comment.findUnique as any).mockResolvedValue(null);
      await expect(
        resourceService.addComment(resourceId, userId, { content: "x", parentId: "nonexistent" }),
      ).rejects.toThrow("Parent comment not found.");
    });
  });

  describe("deleteComment", () => {
    it("deletes own comment", async () => {
      (mockedPrisma.comment.findUnique as any).mockResolvedValue({ id: "c1", userId });
      (mockedPrisma.comment.update as any).mockResolvedValue({});

      const result = await resourceService.deleteComment("c1", userId);
      expect(result.message).toBe("Comment deleted successfully.");
    });

    it("throws FORBIDDEN for non-owner", async () => {
      (mockedPrisma.comment.findUnique as any).mockResolvedValue({ id: "c1", userId: "other" });
      await expect(resourceService.deleteComment("c1", userId)).rejects.toThrow("You can only delete your own comments.");
    });
  });

  describe("reportResource", () => {
    it("submits a report", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId });
      (mockedPrisma.resourceReport.findUnique as any).mockResolvedValue(null);
      (mockedPrisma.$transaction as any).mockImplementation(async (fn: any) => fn({
        resourceReport: { create: vi.fn() },
        resource: { update: vi.fn() },
      }));

      const result = await resourceService.reportResource(resourceId, userId, "SPAM");
      expect(result.message).toBe("Report submitted successfully.");
    });

    it("throws CONFLICT for duplicate report", async () => {
      (mockedPrisma.resource.findUnique as any).mockResolvedValue({ id: resourceId });
      (mockedPrisma.resourceReport.findUnique as any).mockResolvedValue({ id: "r1" });
      await expect(resourceService.reportResource(resourceId, userId, "SPAM")).rejects.toThrow("You have already reported this resource.");
    });
  });

  describe("reviewReport", () => {
    it("reviews a pending report", async () => {
      (mockedPrisma.resourceReport.findUnique as any).mockResolvedValue({ id: "r1", status: "PENDING" });
      (mockedPrisma.resourceReport.update as any).mockResolvedValue({ id: "r1", status: "RESOLVED" });

      const result = await resourceService.reviewReport("r1", "admin-id", "RESOLVED");
      expect(result.status).toBe("RESOLVED");
    });

    it("throws BAD_REQUEST for already reviewed report", async () => {
      (mockedPrisma.resourceReport.findUnique as any).mockResolvedValue({ id: "r1", status: "RESOLVED" });
      await expect(resourceService.reviewReport("r1", "admin-id", "RESOLVED")).rejects.toThrow("Only pending reports can be reviewed.");
    });
  });

  describe("listCategories", () => {
    it("returns all categories", async () => {
      (mockedPrisma.resourceCategory.findMany as any).mockResolvedValue([{ id: "cat1", name: "Notes" }]);
      const result = await resourceService.listCategories();
      expect(result).toHaveLength(1);
    });
  });
});
