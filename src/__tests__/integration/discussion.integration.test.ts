import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  mockUser,
  mockSession,
  mockDiscussionId,
  mockCourseId,
  mockCategoryId,
  mockDiscussion,
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

const mockDiscussionService = vi.hoisted(() => ({
  createDiscussion: vi.fn(),
  getDiscussion: vi.fn(),
  listDiscussions: vi.fn(),
  updateDiscussion: vi.fn(),
  deleteDiscussion: vi.fn(),
  createReply: vi.fn(),
  deleteReply: vi.fn(),
  voteDiscussion: vi.fn(),
  voteReply: vi.fn(),
  bookmarkDiscussion: vi.fn(),
  pinDiscussion: vi.fn(),
  lockDiscussion: vi.fn(),
  markSolved: vi.fn(),
  getBookmarkedDiscussions: vi.fn(),
  listCategories: vi.fn(),
  listTags: vi.fn(),
  getTrending: vi.fn(),
  getTopContributors: vi.fn(),
  getMyDiscussions: vi.fn(),
  getMyReplies: vi.fn(),
}));

vi.mock("../../app/module/discussion/discussion.service", () => ({
  discussionService: mockDiscussionService,
}));

import app from "../../app";
import verifySession from "../../app/middleware/verifySession";

const BASE = "/api/v1/discussions";

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(verifySession).mockImplementation((req: any, _res: any, next: any) => {
    req.user = { ...mockUser };
    req.session = { ...mockSession };
    next();
  });
});

describe("Discussion API Endpoints", () => {
  describe(`POST ${BASE}`, () => {
    const validBody = {
      title: "How to study for finals?",
      content: "I need tips for preparing for final exams.",
      categoryId: mockCategoryId,
      courseId: mockCourseId,
      tagIds: [],
      visibility: "PUBLIC",
    };

    it("should create a discussion and return 201", async () => {
      const created = { ...mockDiscussion, ...validBody };
      mockDiscussionService.createDiscussion.mockResolvedValue(created);

      const res = await request(app)
        .post(BASE)
        .send(validBody)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Discussion created successfully.");
      expect(res.body.data).toEqual(created);
      expect(mockDiscussionService.createDiscussion).toHaveBeenCalledWith(
        expect.objectContaining({ title: "How to study for finals?" }),
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
      expect(mockDiscussionService.createDiscussion).not.toHaveBeenCalled();
    });

    it("should return 400 for missing content", async () => {
      const { content: _, ...bodyWithoutContent } = validBody;

      const res = await request(app)
        .post(BASE)
        .send(bodyWithoutContent)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 400 for invalid categoryId", async () => {
      const res = await request(app)
        .post(BASE)
        .send({ ...validBody, categoryId: "not-a-uuid" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should reject invalid visibility enum", async () => {
      const res = await request(app)
        .post(BASE)
        .send({ ...validBody, visibility: "INVALID" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should allow creating without courseId", async () => {
      const bodyWithoutCourse = { ...validBody };
      delete bodyWithoutCourse.courseId;
      const created = { ...mockDiscussion, courseId: null };
      mockDiscussionService.createDiscussion.mockResolvedValue(created);

      const res = await request(app)
        .post(BASE)
        .send(bodyWithoutCourse)
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  describe(`GET ${BASE}`, () => {
    it("should list discussions with default pagination", async () => {
      const paginatedResult = {
        data: [mockDiscussion],
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      };
      mockDiscussionService.listDiscussions.mockResolvedValue(paginatedResult);

      const res = await request(app)
        .get(BASE)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(paginatedResult);
      expect(mockDiscussionService.listDiscussions).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "latest", page: 1, limit: 12 }),
        mockUser.id,
      );
    });

    it("should pass filter params to service", async () => {
      mockDiscussionService.listDiscussions.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
      });

      await request(app)
        .get(`${BASE}?category=general&tag=dsa,oop&sort=popular&search=exam`)
        .expect(200);

      expect(mockDiscussionService.listDiscussions).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "general",
          tag: "dsa,oop",
          sort: "popular",
          search: "exam",
        }),
        mockUser.id,
      );
    });
  });

  describe(`GET ${BASE}/:id`, () => {
    it("should return a discussion by id", async () => {
      mockDiscussionService.getDiscussion.mockResolvedValue(mockDiscussion);

      const res = await request(app)
        .get(`${BASE}/${mockDiscussionId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockDiscussion);
      expect(mockDiscussionService.getDiscussion).toHaveBeenCalledWith(
        mockDiscussionId,
        mockUser.id,
      );
    });

    it("should return 404 when discussion not found", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockDiscussionService.getDiscussion.mockRejectedValue(
        new AppError(404, "Discussion not found."),
      );

      const res = await request(app)
        .get(`${BASE}/nonexistent-id`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Discussion not found.");
    });
  });

  describe(`PUT ${BASE}/:id`, () => {
    const updateBody = { title: "Updated Discussion Title" };

    it("should update own discussion", async () => {
      const updated = { ...mockDiscussion, ...updateBody };
      mockDiscussionService.updateDiscussion.mockResolvedValue(updated);

      const res = await request(app)
        .put(`${BASE}/${mockDiscussionId}`)
        .send(updateBody)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Discussion updated successfully.");
      expect(mockDiscussionService.updateDiscussion).toHaveBeenCalledWith(
        mockDiscussionId,
        expect.objectContaining({ title: "Updated Discussion Title" }),
        mockUser.id,
      );
    });

    it("should return 400 for empty title", async () => {
      const res = await request(app)
        .put(`${BASE}/${mockDiscussionId}`)
        .send({ title: "" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 403 when editing another user's discussion", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockDiscussionService.updateDiscussion.mockRejectedValue(
        new AppError(403, "You can only edit your own discussions."),
      );

      await request(app)
        .put(`${BASE}/${mockDiscussionId}`)
        .send(updateBody)
        .expect(403);
    });
  });

  describe(`DELETE ${BASE}/:id`, () => {
    it("should delete own discussion", async () => {
      mockDiscussionService.deleteDiscussion.mockResolvedValue({
        message: "Discussion deleted successfully.",
      });

      const res = await request(app)
        .delete(`${BASE}/${mockDiscussionId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Discussion deleted successfully.");
      expect(mockDiscussionService.deleteDiscussion).toHaveBeenCalledWith(
        mockDiscussionId,
        mockUser.id,
      );
    });

    it("should return 403 when deleting another user's discussion", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockDiscussionService.deleteDiscussion.mockRejectedValue(
        new AppError(403, "You can only delete your own discussions."),
      );

      await request(app)
        .delete(`${BASE}/${mockDiscussionId}`)
        .expect(403);
    });
  });

  describe(`POST ${BASE}/:id/replies`, () => {
    const replyBody = { content: "Great question!" };

    it("should create a reply on a discussion", async () => {
      const reply = {
        id: "reply-1",
        content: "Great question!",
        discussionId: mockDiscussionId,
        authorId: mockUser.id,
        author: { id: mockUser.id, name: mockUser.name, email: mockUser.email, image: null },
      };
      mockDiscussionService.createReply.mockResolvedValue(reply);

      const res = await request(app)
        .post(`${BASE}/${mockDiscussionId}/replies`)
        .send(replyBody)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Reply created successfully.");
      expect(res.body.data).toEqual(reply);
      expect(mockDiscussionService.createReply).toHaveBeenCalledWith(
        mockDiscussionId,
        expect.objectContaining({ content: "Great question!" }),
        mockUser.id,
      );
    });

    it("should return 400 for empty reply content", async () => {
      const res = await request(app)
        .post(`${BASE}/${mockDiscussionId}/replies`)
        .send({ content: "" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe(`POST ${BASE}/:id/vote`, () => {
    it("should add an upvote to a discussion", async () => {
      mockDiscussionService.voteDiscussion.mockResolvedValue({
        action: "added",
        upvoteCount: 4,
      });

      const res = await request(app)
        .post(`${BASE}/${mockDiscussionId}/vote`)
        .send({ type: "UP" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe("added");
      expect(res.body.data.upvoteCount).toBe(4);
    });

    it("should reject invalid vote type", async () => {
      const res = await request(app)
        .post(`${BASE}/${mockDiscussionId}/vote`)
        .send({ type: "INVALID" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe(`POST ${BASE}/:id/bookmark`, () => {
    it("should bookmark a discussion", async () => {
      mockDiscussionService.bookmarkDiscussion.mockResolvedValue({ action: "added" });

      const res = await request(app)
        .post(`${BASE}/${mockDiscussionId}/bookmark`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Bookmarked successfully.");
      expect(mockDiscussionService.bookmarkDiscussion).toHaveBeenCalledWith(
        mockDiscussionId,
        mockUser.id,
      );
    });

    it("should unbookmark a discussion", async () => {
      mockDiscussionService.bookmarkDiscussion.mockResolvedValue({ action: "removed" });

      const res = await request(app)
        .post(`${BASE}/${mockDiscussionId}/bookmark`)
        .expect(200);

      expect(res.body.data.action).toBe("removed");
      expect(res.body.message).toBe("Bookmark removed.");
    });
  });

  describe(`PUT ${BASE}/:id/solved`, () => {
    it("should mark discussion as solved", async () => {
      mockDiscussionService.markSolved.mockResolvedValue({ isSolved: true });

      const res = await request(app)
        .put(`${BASE}/${mockDiscussionId}/solved`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isSolved).toBe(true);
    });

    it("should unmark discussion as solved", async () => {
      mockDiscussionService.markSolved.mockResolvedValue({ isSolved: false });

      const res = await request(app)
        .put(`${BASE}/${mockDiscussionId}/solved`)
        .expect(200);

      expect(res.body.data.isSolved).toBe(false);
    });
  });

  describe(`PUT ${BASE}/:id/pin`, () => {
    it("should pin discussion as admin", async () => {
      vi.mocked(verifySession).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { ...mockAdminUser };
        req.session = { ...mockSession };
        next();
      });

      mockDiscussionService.pinDiscussion.mockResolvedValue({ isPinned: true });

      const res = await request(app)
        .put(`${BASE}/${mockDiscussionId}/pin`)
        .expect(200);

      expect(res.body.data.isPinned).toBe(true);
    });
  });

  describe(`PUT ${BASE}/:id/lock`, () => {
    it("should lock discussion as admin", async () => {
      vi.mocked(verifySession).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { ...mockAdminUser };
        req.session = { ...mockSession };
        next();
      });

      mockDiscussionService.lockDiscussion.mockResolvedValue({ isLocked: true });

      const res = await request(app)
        .put(`${BASE}/${mockDiscussionId}/lock`)
        .expect(200);

      expect(res.body.data.isLocked).toBe(true);
    });
  });

  describe("GET auxiliary endpoints", () => {
    it("GET /bookmarks should return bookmarked discussions", async () => {
      mockDiscussionService.getBookmarkedDiscussions.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
      });

      const res = await request(app)
        .get(`${BASE}/bookmarks`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /me should return user's discussions", async () => {
      mockDiscussionService.getMyDiscussions.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
      });

      const res = await request(app)
        .get(`${BASE}/me`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /replies/mine should return discussions user replied to", async () => {
      mockDiscussionService.getMyReplies.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
      });

      const res = await request(app)
        .get(`${BASE}/replies/mine`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /categories should return categories", async () => {
      mockDiscussionService.listCategories.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/categories`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /tags should return tags", async () => {
      mockDiscussionService.listTags.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/tags`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /trending should return trending discussions", async () => {
      mockDiscussionService.getTrending.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/trending`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /contributors should return top contributors", async () => {
      mockDiscussionService.getTopContributors.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/contributors`)
        .expect(200);

      expect(res.body.success).toBe(true);
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
});
