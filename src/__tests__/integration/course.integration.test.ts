import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { mockUser, mockSession, mockCourseId } from "../fixtures";

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
    AI_PROVIDER: "gemini",
    AI_PROVIDER_API_KEY: "test-key",
    AI_PROVIDER_MODEL: "gemini-1.5-flash",
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

const mockCourseService = vi.hoisted(() => ({
  getCourseById: vi.fn(),
}));

vi.mock("../../app/module/course/course.service", () => ({
  courseService: mockCourseService,
}));

import app from "../../app";
import verifySession from "../../app/middleware/verifySession";

const BASE = "/api/v1/courses";

const mockCourseDetail = {
  id: mockCourseId,
  code: "CSE101",
  name: "Introduction to Programming",
  department: "CSE",
  semester: 1,
  description: "A gentle introduction to programming concepts.",
  isDeleted: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  _count: { resources: 5, discussions: 2, questions: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(verifySession).mockImplementation((req: any, _res: any, next: any) => {
    req.user = { ...mockUser };
    req.session = { ...mockSession };
    next();
  });
});

describe("Course API Endpoints", () => {
  it("GET /courses/:id returns the course with item counts", async () => {
    mockCourseService.getCourseById.mockResolvedValue(mockCourseDetail);

    const res = await request(app).get(`${BASE}/${mockCourseId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockCourseDetail);
    expect(mockCourseService.getCourseById).toHaveBeenCalledWith(mockCourseId);
  });

  it("GET /courses/:id returns 404 when the course does not exist", async () => {
    mockCourseService.getCourseById.mockResolvedValue(null);

    const res = await request(app).get(`${BASE}/${mockCourseId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });

  it("GET /courses/:id requires authentication", async () => {
    vi.mocked(verifySession).mockImplementationOnce(
      (_req: any, _res: any, next: any) => next(new Error("Unauthorized")),
    );

    const res = await request(app).get(`${BASE}/${mockCourseId}`);
    expect(res.status).toBe(500);
    expect(mockCourseService.getCourseById).not.toHaveBeenCalled();
  });
});
