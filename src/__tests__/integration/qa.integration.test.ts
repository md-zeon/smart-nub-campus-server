import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  mockUser,
  mockUser2,
  mockSession,
  mockQuestionId,
  mockAnswerId,
  mockCourseId,
  mockCategoryId,
  mockQuestion,
  mockAnswer,
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

const mockQaService = vi.hoisted(() => ({
  createQuestion: vi.fn(),
  getQuestion: vi.fn(),
  listAnswers: vi.fn(),
  listQuestions: vi.fn(),
  listCategories: vi.fn(),
  listTags: vi.fn(),
  getTopContributors: vi.fn(),
  getTrending: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  createAnswer: vi.fn(),
  deleteAnswer: vi.fn(),
  acceptAnswer: vi.fn(),
  unacceptAnswer: vi.fn(),
  voteQuestion: vi.fn(),
  voteAnswer: vi.fn(),
  bookmarkQuestion: vi.fn(),
  getBookmarkedQuestions: vi.fn(),
}));

vi.mock("../../app/module/qa/qa.service", () => ({
  qaService: mockQaService,
}));

import app from "../../app";
import verifySession from "../../app/middleware/verifySession";

const BASE = "/api/v1/qa";

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(verifySession).mockImplementation((req: any, _res: any, next: any) => {
    req.user = { ...mockUser };
    req.session = { ...mockSession };
    next();
  });
});

describe("Q&A API Endpoints", () => {
  describe(`POST ${BASE}`, () => {
    const validBody = {
      title: "How to implement a binary search tree?",
      content: "I need help understanding BST insertion in Java.",
      categoryId: mockCategoryId,
      courseId: mockCourseId,
      tagIds: [],
    };

    it("should create a question and return 201", async () => {
      const created = { ...mockQuestion, ...validBody };
      mockQaService.createQuestion.mockResolvedValue(created);

      const res = await request(app)
        .post(BASE)
        .send(validBody)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Question created successfully.");
      expect(res.body.data).toEqual(created);
      expect(mockQaService.createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({ title: "How to implement a binary search tree?" }),
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
      expect(mockQaService.createQuestion).not.toHaveBeenCalled();
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

    it("should reject extra fields", async () => {
      const res = await request(app)
        .post(BASE)
        .send({ ...validBody, hackAttempt: true })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should allow creating without courseId", async () => {
      const bodyWithoutCourse = { ...validBody };
      delete bodyWithoutCourse.courseId;
      const created = { ...mockQuestion, courseId: null };
      mockQaService.createQuestion.mockResolvedValue(created);

      const res = await request(app)
        .post(BASE)
        .send(bodyWithoutCourse)
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  describe(`GET ${BASE}`, () => {
    it("should list questions with default pagination", async () => {
      const paginatedResult = {
        data: [mockQuestion],
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      };
      mockQaService.listQuestions.mockResolvedValue(paginatedResult);

      const res = await request(app)
        .get(BASE)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(paginatedResult);
      expect(mockQaService.listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "latest", page: 1, limit: 12 }),
        mockUser.id,
      );
    });

    it("should pass filter and sort params to service", async () => {
      mockQaService.listQuestions.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
      });

      await request(app)
        .get(`${BASE}?category=programming&tag=java&sort=popular&answered=true&search=sort`)
        .expect(200);

      expect(mockQaService.listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "programming",
          tag: "java",
          sort: "popular",
          answered: "true",
          search: "sort",
        }),
        mockUser.id,
      );
    });
  });

  describe(`GET ${BASE}/:id`, () => {
    it("should return a question by id", async () => {
      mockQaService.getQuestion.mockResolvedValue(mockQuestion);

      const res = await request(app)
        .get(`${BASE}/${mockQuestionId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockQuestion);
      expect(mockQaService.getQuestion).toHaveBeenCalledWith(
        mockQuestionId,
        mockUser.id,
      );
    });

    it("should return 404 when question not found", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockQaService.getQuestion.mockRejectedValue(
        new AppError(404, "Question not found."),
      );

      const res = await request(app)
        .get(`${BASE}/nonexistent-id`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Question not found.");
    });
  });

  describe(`PUT ${BASE}/:id`, () => {
    const updateBody = { title: "Updated Question Title" };

    it("should update own question", async () => {
      const updated = { ...mockQuestion, ...updateBody };
      mockQaService.updateQuestion.mockResolvedValue(updated);

      const res = await request(app)
        .put(`${BASE}/${mockQuestionId}`)
        .send(updateBody)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Question updated successfully.");
      expect(mockQaService.updateQuestion).toHaveBeenCalledWith(
        mockQuestionId,
        expect.objectContaining({ title: "Updated Question Title" }),
        mockUser.id,
      );
    });

    it("should return 400 for empty title", async () => {
      const res = await request(app)
        .put(`${BASE}/${mockQuestionId}`)
        .send({ title: "" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("should return 403 when editing another user's question", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockQaService.updateQuestion.mockRejectedValue(
        new AppError(403, "You can only edit your own questions."),
      );

      await request(app)
        .put(`${BASE}/${mockQuestionId}`)
        .send(updateBody)
        .expect(403);
    });
  });

  describe(`DELETE ${BASE}/:id`, () => {
    it("should delete own question", async () => {
      mockQaService.deleteQuestion.mockResolvedValue({
        message: "Question deleted successfully.",
      });

      const res = await request(app)
        .delete(`${BASE}/${mockQuestionId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Question deleted successfully.");
      expect(mockQaService.deleteQuestion).toHaveBeenCalledWith(
        mockQuestionId,
        mockUser.id,
      );
    });

    it("should return 403 when deleting another user's question", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockQaService.deleteQuestion.mockRejectedValue(
        new AppError(403, "You can only delete your own questions."),
      );

      await request(app)
        .delete(`${BASE}/${mockQuestionId}`)
        .expect(403);
    });
  });

  describe(`POST ${BASE}/:id/answers`, () => {
    const answerBody = { content: "Use Array.sort() for simple sorting." };

    it("should create an answer on a question", async () => {
      const answer = {
        ...mockAnswer,
        ...answerBody,
        questionId: mockQuestionId,
      };
      mockQaService.createAnswer.mockResolvedValue(answer);

      const res = await request(app)
        .post(`${BASE}/${mockQuestionId}/answers`)
        .send(answerBody)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Answer created successfully.");
      expect(res.body.data).toEqual(answer);
      expect(mockQaService.createAnswer).toHaveBeenCalledWith(
        mockQuestionId,
        expect.objectContaining({ content: "Use Array.sort() for simple sorting." }),
        mockUser.id,
      );
    });

    it("should return 400 for empty answer content", async () => {
      const res = await request(app)
        .post(`${BASE}/${mockQuestionId}/answers`)
        .send({ content: "" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe(`DELETE ${BASE}/:id/answers/:answerId`, () => {
    it("should delete an answer", async () => {
      mockQaService.deleteAnswer.mockResolvedValue({
        message: "Answer deleted successfully.",
      });

      const res = await request(app)
        .delete(`${BASE}/${mockQuestionId}/answers/${mockAnswerId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Answer deleted successfully.");
      expect(mockQaService.deleteAnswer).toHaveBeenCalledWith(
        mockAnswerId,
        mockUser.id,
      );
    });

    it("should return 403 when deleting another user's answer", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockQaService.deleteAnswer.mockRejectedValue(
        new AppError(403, "You can only delete your own answers."),
      );

      await request(app)
        .delete(`${BASE}/${mockQuestionId}/answers/${mockAnswerId}`)
        .expect(403);
    });
  });

  describe(`PUT ${BASE}/:id/answers/:answerId/accept`, () => {
    it("should accept an answer as the question author", async () => {
      mockQaService.acceptAnswer.mockResolvedValue({
        isAccepted: true,
        isAnswered: true,
      });

      const res = await request(app)
        .put(`${BASE}/${mockQuestionId}/answers/${mockAnswerId}/accept`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Answer accepted successfully.");
      expect(mockQaService.acceptAnswer).toHaveBeenCalledWith(
        mockQuestionId,
        mockAnswerId,
        mockUser.id,
      );
    });

    it("should return 403 when non-author tries to accept", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockQaService.acceptAnswer.mockRejectedValue(
        new AppError(403, "Only the question author can accept answers."),
      );

      await request(app)
        .put(`${BASE}/${mockQuestionId}/answers/${mockAnswerId}/accept`)
        .expect(403);
    });
  });

  describe(`DELETE ${BASE}/:id/accept`, () => {
    it("should unaccept the accepted answer", async () => {
      mockQaService.unacceptAnswer.mockResolvedValue({
        isAccepted: false,
        isAnswered: false,
      });

      const res = await request(app)
        .delete(`${BASE}/${mockQuestionId}/accept`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Accepted answer removed.");
      expect(mockQaService.unacceptAnswer).toHaveBeenCalledWith(
        mockQuestionId,
        mockUser.id,
      );
    });
  });

  describe(`POST ${BASE}/:id/vote`, () => {
    it("should add an upvote to a question", async () => {
      vi.mocked(verifySession).mockImplementation((req: any, _res: any, next: any) => {
        req.user = { ...mockUser, id: mockUser2.id };
        req.session = { ...mockSession };
        next();
      });

      mockQaService.voteQuestion.mockResolvedValue({
        action: "added",
        upvoteCount: 11,
      });

      const res = await request(app)
        .post(`${BASE}/${mockQuestionId}/vote`)
        .send({ type: "UP" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe("added");
      expect(res.body.data.upvoteCount).toBe(11);
    });

    it("should reject self-voting", async () => {
      const AppError = (await import("../../app/errorHelpers/AppError")).default;
      mockQaService.voteQuestion.mockRejectedValue(
        new AppError(400, "You cannot vote on your own question."),
      );

      await request(app)
        .post(`${BASE}/${mockQuestionId}/vote`)
        .send({ type: "UP" })
        .expect(400);
    });

    it("should reject invalid vote type", async () => {
      const res = await request(app)
        .post(`${BASE}/${mockQuestionId}/vote`)
        .send({ type: "INVALID" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe(`POST ${BASE}/answers/:answerId/vote`, () => {
    it("should add an upvote to an answer", async () => {
      mockQaService.voteAnswer.mockResolvedValue({
        action: "added",
        upvoteCount: 9,
      });

      const res = await request(app)
        .post(`${BASE}/answers/${mockAnswerId}/vote`)
        .send({ type: "UP" })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe("added");
    });

    it("should reject invalid vote type", async () => {
      const res = await request(app)
        .post(`${BASE}/answers/${mockAnswerId}/vote`)
        .send({ type: "INVALID" })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe(`POST ${BASE}/:id/bookmark`, () => {
    it("should bookmark a question", async () => {
      mockQaService.bookmarkQuestion.mockResolvedValue({ action: "added" });

      const res = await request(app)
        .post(`${BASE}/${mockQuestionId}/bookmark`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Bookmarked successfully.");
      expect(mockQaService.bookmarkQuestion).toHaveBeenCalledWith(
        mockQuestionId,
        mockUser.id,
      );
    });

    it("should unbookmark a question", async () => {
      mockQaService.bookmarkQuestion.mockResolvedValue({ action: "removed" });

      const res = await request(app)
        .post(`${BASE}/${mockQuestionId}/bookmark`)
        .expect(200);

      expect(res.body.data.action).toBe("removed");
      expect(res.body.message).toBe("Bookmark removed.");
    });
  });

  describe("GET auxiliary endpoints", () => {
    it("GET /categories should return question categories", async () => {
      mockQaService.listCategories.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/categories`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /tags should return tags", async () => {
      mockQaService.listTags.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/tags`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /contributors should return top contributors", async () => {
      mockQaService.getTopContributors.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/contributors`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /trending should return trending questions", async () => {
      mockQaService.getTrending.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/trending`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /bookmarks should return bookmarked questions", async () => {
      mockQaService.getBookmarkedQuestions.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
      });

      const res = await request(app)
        .get(`${BASE}/bookmarks`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("GET /:id/answers should return answers for a question", async () => {
      mockQaService.listAnswers.mockResolvedValue([]);

      const res = await request(app)
        .get(`${BASE}/${mockQuestionId}/answers`)
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
