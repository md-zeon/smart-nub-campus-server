import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

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
  prisma.$queryRaw = vi.fn();
  prisma.$transaction = vi.fn(async (fns: any) => {
    if (Array.isArray(fns)) return Promise.all(fns);
    if (typeof fns === "function") return fns(prisma);
    return [];
  });
  prisma.$connect = vi.fn();
  prisma.$disconnect = vi.fn();
  return prisma;
});

vi.mock("../../../../config/env", () => ({
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

vi.mock("../../../lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../../../app/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      requestPasswordResetEmailOTP: vi.fn(),
      resetPasswordEmailOTP: vi.fn(),
    },
  },
}));

vi.mock("../../../../app/lib/mail", () => ({
  mailService: {
    sendEmailVerificationOTP: vi.fn(),
    sendPasswordResetOTP: vi.fn(),
  },
}));

vi.mock("../../../../app/middleware/verifySession", () => ({
  default: vi.fn((req: any, _res: any, next: any) => next()),
}));

import app from "../../../../app";

describe("Health Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /health returns 200 with database connected", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const res = await request(app).get("/health");
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("GET /health returns 503 when the database is unreachable", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("connection refused"));

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("unavailable");
  });
});


