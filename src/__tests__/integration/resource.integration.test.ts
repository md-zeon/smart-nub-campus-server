import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  mockUser,
  mockSession,
  mockResourceId,
  mockCourseId,
  mockCategoryId,
  mockResource,
  mockAdminUser,
} from "../fixtures";

const mockPrisma = vi.hoisted(() => {
  const createModel = () =>
    new Proxy({} as Record<string, any>, {
      get: () => vi.fn(),
    });

  const models = [
    "user", "session", "account", "verification", "student", "admin",
    "resource", "resourceTag", "resourceVote", "resourceBookmark",
    "resourceDownload", "resourceReport", "resourceCategory",
    "course", "tag", "comment",
    "discussion", "discussionTag", "discussionVote", "discussionReply",
    "discussionReplyVote", "discussionBookmark", "discussionCategory",
    "question", "questionTag", "questionVote", "questionBookmark",
    "questionCategory", "answer", "answerVote",
    "event", "eventRSVP", "connection", "conversation",
    "conversationParticipant", "message", "notification",
    "reputationPoint", "userBadge", "badge", "userProfile",
    "userSkill", "teamMember", "teamRequest", "teamApplication",
    "teamRequestSkill", "blockedUser", "auditLog", "onboardingStep",
    "verificationRequest", "aiChatSession", "aiMessage", "aiStudyStats",
  ];

  const prisma: Record<string, any> = {};
  for (const m of models) prisma[m] = createModel();
  prisma.$transaction = vi.fn(async (fns: any) => {
    if (Array.isArray(fns)) return Promise.all(fns);
    if (typeof fns === "function") return fns(prisma);
    return [];
  });
  prisma.$connect = vi.fn();
  prisma.$disconnect = vi.fn();
  return prisma;
});

vi.mock("../../config/env", () => ({
  default: {
    NODE_ENV: "test",
    PORT: "3001",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test_db",
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:3001",
    CORS_ORIGINS: ["http://localhost:3000"],
    RATE_LIMIT_LOGIN_WINDOW_MS: 900_000,
    RATE_LIMIT_LOGIN_MAX: 5,
    RATE_LIMIT_OTP_WINDOW_MS: 600_000,
    RATE_LIMIT_OTP_MAX: 3,
    RATE_LIMIT_VERIFICATION_WINDOW_MS: 86_400_000,
    RATE_LIMIT_VERIFICATION_MAX: 5,
    CLOUDINARY_CLOUD_NAME: "test",
    CLOUDINARY_API_KEY: "test",
    CLOUDINARY_API_SECRET: "test",
    MAIL_PROVIDER: "resend",
  },
}));

vi.mock("better-auth/node", () => ({
  toNodeHandler: vi.fn(() => (_req: unknown, res: any, next?: any) => {
    res?.writeHead?.(200);
    res?.end?.();
    next?.();
  }),
  fromNodeHeaders: vi.fn(() => ({})),
}));

vi.mock("../../app/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../app/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      requestPasswordResetEmailOTP: vi.fn(),
      resetPasswordEmailOTP: vi.fn(),
    },
  },
}));

vi.mock("../../app/lib/mail", () => ({
  mailService: {
    sendEmailVerificationOTP: vi.fn(),
    sendPasswordResetOTP: vi.fn(),
  },
}));

vi.mock("../../app/middleware/verifySession", () => ({
  default: vi.fn((req: any, _res: any, next: any) => {
    req.user = { ...mockUser };
    req.session = { ...mockSession };
    next();
  }),
}));

const mockResourceService = vi.hoisted(() => ({
  createResource: vi.fn(),
  getResourceById: vi.fn(),
  listResources: vi.fn(),
  listCategories: vi.fn(),
  listCourses: vi.fn(),
  listTags: vi.fn(),
  updateResource: vi.fn(),
  deleteResource: vi.fn(),
  toggleVote: vi.fn(),
  toggleBookmark: vi.fn(),
  trackDownload: vi.fn(),
  addComment: vi.fn(),
  getComments: vi.fn(),
  deleteComment: vi.fn(),
  reportResource: vi.fn(),
  getReports: vi.fn(),
  reviewReport: vi.fn(),
}));

vi.mock("../../app/module/resource/resource.service", () => ({
  resourceService: mockResourceService,
}));

import app from "../../app";
import verifySession from "../../app/middleware/verifySession";

const BASE = "/api/v1/resources";

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(verifySession).mockImplementation((req: any, _res: any, next: any) => {
    req.user = { ...mockUser };
    req.session = { ...mockSession };
    next();
  });
});

describe("Resource API Endpoints", () => {
  describe(`POST ${BASE}`, () => {
    const validBody = {
      title: "Data Structures Notes",
      description: "Comprehensive notes on DSA",
      fileUrl: "https://example.com/dsa-notes.pdf",
      fileType: "application/pdf",
      fileSize: 2048,
      courseId: mockCourseId,
      categoryId: mockCategoryId,
      tags: ["dsa", "algorithms"],
    };

    it("should create a resource and return 201", async () => {
      const created = { ...mockResource, ...validBody };
      mockResourceService.createResource.mockResolvedValue(created);

      const res = await request(app)
        .post(BASE)
        .send(validBody)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Resource created successfully.");
      expect(res.body.data).toEqual(created);
      expect(mockResourceService.createResource).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Data Structures Notes" }),
        mockUser.id,
      );
    });

    it("should return 400 for missing title", async () => {
      const { title: _, ...bodyWithoutTitle } = validBody;

      const res = await request(app)
        .post(BASE)
        .send(bodyWithoutTitle)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(mockResourceService.createResource).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid fileUrl", async () => {
      const res = await request(app)
        .post(BASE)
        .send({ ...validBody, fileUrl: "not-a-url" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 400 for empty tags array", async () => {
      const res = await request(app)
        .post(BASE)
        .send({ ...validBody, tags: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 400 for invalid courseId format", async () => {
      const res = await request(app)
        .post(BASE)
        .send({ ...validBody, courseId: "not-a-uuid" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject extra fields with strict validation", async () => {
      const res = await request(app)
        .post(BASE)
        .send({ ...validBody, extraField: "should not be allowed" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe(`GET ${BASE}`, () => {
    it("should list resources with default pagination", async () => {
      const paginatedResult = {
        data: [mockResource],
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      };
      mockResourceService.listResources.mockResolvedValue(paginatedResult);

      const res = await request(app)
        .get(BASE)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(paginatedResult);
      expect(mockResourceService.listResources).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "newest", page: 1, limit: 12 }),
        mockUser.id,
      );
    });

    it("should pass query params to service", async () => {
      mockResourceService.listResources.mockResolvedValue({
        data: [],
        meta: { page: 2, limit: 6, total: 0, totalPages: 0 },
      });

      await request(app)
        .get(`${BASE}?page=2&limit=6&sort=popular&search=dsa&courseId=${mockCourseId}`)
        .expect(200);

      expect(mockResourceService.listResources).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 6,
          sort: "popular",
          search: "dsa",
          courseId: mockCourseId,
        }),
        mockUser.id,
      );
    });

    it("should handle empty results", async () => {
      mockResourceService.listResources.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
      });

      const res = await request(app)
        .get(BASE)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toEqual([]);
    });
  });

  describe(`GET ${BASE}/:id`, () => {
    it("should return a resource by id", async () => {
      mockResourceService.getResourceById.mockResolvedValue(mockResource);

      const res = await request(app)
        .get(`${BASE}/${mockResourceId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockResource);
      expect(mockResourceService.getResourceById).toHaveBeenCalledWith(
        mockResourceId,
        mockUser.id,
      );
    });

    it("should return 404 when resource not found", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockResourceService.getResourceById.mockRejectedValue(
        new AppError(404, "Resource not found."),
      );

      const res = await request(app)
        .get(`${BASE}/nonexistent-id`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Resource not found.");
    });
  });

  describe(`PATCH ${BASE}/:id`, () => {
    const updateBody = {
      title: "Updated Title",
      description: "Updated description",
    };

    it("should update own resource", async () => {
      const updated = { ...mockResource, ...updateBody };
      mockResourceService.updateResource.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`${BASE}/${mockResourceId}`)
        .send(updateBody)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Resource updated successfully.");
      expect(mockResourceService.updateResource).toHaveBeenCalledWith(
        mockResourceId,
        expect.objectContaining({ title: "Updated Title" }),
        mockUser.id,
      );
    });

    it("should return 400 for empty title", async () => {
      const res = await request(app)
        .patch(`${BASE}/${mockResourceId}`)
        .send({ title: "" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 403 when editing another user's resource", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockResourceService.updateResource.mockRejectedValue(
        new AppError(403, "You can only edit your own resources."),
      );

      const res = await request(app)
        .patch(`${BASE}/${mockResourceId}`)
        .send(updateBody)
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe(`DELETE ${BASE}/:id`, () => {
    it("should delete own resource", async () => {
      mockResourceService.deleteResource.mockResolvedValue({
        message: "Resource deleted successfully.",
      });

      const res = await request(app)
        .delete(`${BASE}/${mockResourceId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Resource deleted successfully.");
      expect(mockResourceService.deleteResource).toHaveBeenCalledWith(
        mockResourceId,
        mockUser.id,
      );
    });

    it("should return 404 when resource not found", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockResourceService.deleteResource.mockRejectedValue(
        new AppError(404, "Resource not found."),
      );

      await request(app)
        .delete(`${BASE}/nonexistent-id`)
        .expect(404);
    });

    it("should return 403 when deleting another user's resource", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockResourceService.deleteResource.mockRejectedValue(
        new AppError(403, "You can only delete your own resources."),
      );

      await request(app)
        .delete(`${BASE}/${mockResourceId}`)
        .expect(403);
    });
  });

  describe(`POST ${BASE}/:id/upvote`, () => {
    it("should add an upvote", async () => {
      mockResourceService.toggleVote.mockResolvedValue({
        action: "added",
        upvoteCount: 6,
        downvoteCount: 1,
      });

      const res = await request(app)
        .post(`${BASE}/${mockResourceId}/upvote`)
        .send({ type: "UP" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Vote added successfully.");
      expect(res.body.data.upvoteCount).toBe(6);
    });

    it("should remove vote when toggling same type", async () => {
      mockResourceService.toggleVote.mockResolvedValue({
        action: "removed",
        upvoteCount: 4,
        downvoteCount: 1,
      });

      const res = await request(app)
        .post(`${BASE}/${mockResourceId}/upvote`)
        .send({ type: "UP" })
        .expect(200);

      expect(res.body.data.action).toBe("removed");
    });

    it("should return 404 when resource not found", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockResourceService.toggleVote.mockRejectedValue(
        new AppError(404, "Resource not found."),
      );

      await request(app)
        .post(`${BASE}/nonexistent-id/upvote`)
        .send({ type: "UP" })
        .expect(404);
    });
  });

  describe(`POST ${BASE}/:id/bookmark`, () => {
    it("should add a bookmark", async () => {
      mockResourceService.toggleBookmark.mockResolvedValue({ action: "added" });

      const res = await request(app)
        .post(`${BASE}/${mockResourceId}/bookmark`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Bookmark added successfully.");
      expect(mockResourceService.toggleBookmark).toHaveBeenCalledWith(
        mockResourceId,
        mockUser.id,
      );
    });

    it("should remove bookmark when toggling", async () => {
      mockResourceService.toggleBookmark.mockResolvedValue({ action: "removed" });

      const res = await request(app)
        .post(`${BASE}/${mockResourceId}/bookmark`)
        .expect(200);

      expect(res.body.data.action).toBe("removed");
      expect(res.body.message).toBe("Bookmark removed successfully.");
    });
  });

  describe("Authentication", () => {
    it("should return 401 when session is invalid", async () => {
      vi.mocked(verifySession).mockImplementation((_req: any, res: any, _next: any) => {
        res.status(401).json({
          success: false,
          message: "Invalid or expired session.",
        });
      });

      await request(app)
        .get(BASE)
        .expect(401);
    });
  });

  describe("Admin endpoints", () => {
    it("should return 403 for non-admin users on admin routes", async () => {
      await request(app)
        .get(`${BASE}/admin/reports`)
        .expect(403);
    });

    it("should allow admin users on admin routes", async () => {
      vi.mocked(verifySession).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { ...mockAdminUser };
        req.session = { ...mockSession };
        next();
      });

      mockResourceService.getReports.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await request(app)
        .get(`${BASE}/admin/reports`)
        .expect(200);
    });
  });
});
