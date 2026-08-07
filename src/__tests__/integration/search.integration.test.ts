import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { mockUser, mockSession } from "../fixtures";

const mockPrisma = vi.hoisted(() => {
  const prisma: Record<string, any> = {
    user: { findUnique: vi.fn() },
    searchAnalytics: { create: vi.fn() },
    searchClick: { create: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(async (fns: any) => {
      if (Array.isArray(fns)) return Promise.all(fns);
      if (typeof fns === "function") return fns(prisma);
      return [];
    }),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
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

import app from "../../app";
import verifySession from "../../app/middleware/verifySession";

const BASE = "/api/v1/search";

const courseRows = [
  {
    id: "course-1",
    title: "Database Systems",
    snippet: "<mark>database</mark> systems and design",
    subtitle: "CSE315",
    rank: 0.5,
    createdAt: "2024-01-01T00:00:00.000Z",
    code: "CSE315",
    department: "CSE",
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(verifySession).mockImplementation((req: any, _res: any, next: any) => {
    req.user = { ...mockUser };
    req.session = { ...mockSession };
    next();
  });

  vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
    id: mockUser.id,
    student: { department: "CSE" },
    profile: { batchYear: 2022 },
  });
  vi.mocked(mockPrisma.searchAnalytics.create).mockResolvedValue({});
  vi.mocked(mockPrisma.searchClick.create).mockResolvedValue({});
  vi.mocked(mockPrisma.$queryRawUnsafe).mockImplementation(
    async (sql: string): Promise<unknown[]> => {
      const fromCourse = String(sql).includes('FROM "course"');
      if (String(sql).includes("COUNT(*)")) {
        return [{ count: fromCourse ? 2 : 0 }];
      }
      return fromCourse ? courseRows : [];
    },
  );
});

describe("Search API Endpoints", () => {
  it("GET /search?q= returns grouped data with meta + bestMatch", async () => {
    const res = await request(app).get(BASE).query({ q: "database" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.query).toBe("database");
    expect(res.body.data.data.courses.total).toBe(2);
    expect(res.body.data.data.resources.total).toBe(0);
    expect(res.body.data.data.courses.items[0].title).toBe("Database Systems");
    expect(res.body.data.data.courses.items[0].snippet).toContain("<mark>");
    expect(res.body.data.meta.total).toBe(2);
    expect(res.body.data.meta.bestMatch.title).toBe("Database Systems");
    for (const entity of [
      "people", "resources", "discussions", "questions", "teams",
      "events", "courses", "jobs", "mentorship",
    ]) {
      expect(res.body.data.data).toHaveProperty(entity);
    }
  });

  it("GET /search?q=&entity= only queries that entity", async () => {
    const res = await request(app).get(BASE).query({ q: "database", entity: "courses" });

    expect(res.status).toBe(200);
    expect(res.body.data.data.courses.total).toBe(2);
    expect(res.body.data.data.resources.total).toBe(0);

    const selectSqls = vi
      .mocked(mockPrisma.$queryRawUnsafe)
      .mock.calls.map(([sql]) => String(sql))
      .filter((sql) => !sql.includes("COUNT(*)"));
    expect(selectSqls).toHaveLength(1);
    expect(selectSqls[0]).toContain('FROM "course"');
  });

  it("GET /search without q returns 400", async () => {
    const res = await request(app).get(BASE);

    expect(res.status).toBe(400);
  });

  it("GET /search with q longer than 120 chars returns 400", async () => {
    const res = await request(app).get(BASE).query({ q: "a".repeat(121) });

    expect(res.status).toBe(400);
  });

  it("GET /search requires authentication", async () => {
    vi.mocked(verifySession).mockImplementationOnce((_req: any, _res: any, next: any) =>
      next(new Error("Unauthorized")),
    );

    const res = await request(app).get(BASE).query({ q: "database" });
    expect(res.status).toBe(500);
  });

  it("POST /search/click records a click", async () => {
    const res = await request(app).post(`${BASE}/click`).send({
      query: "database",
      entity: "courses",
      resultId: "course-1",
      position: 1,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.searchClick.create).toHaveBeenCalledWith({
      data: {
        userId: mockUser.id,
        query: "database",
        entity: "courses",
        resultId: "course-1",
        position: 1,
      },
    });
  });

  it("POST /search/click with invalid body returns 400", async () => {
    const res = await request(app).post(`${BASE}/click`).send({ query: "database" });

    expect(res.status).toBe(400);
    expect(mockPrisma.searchClick.create).not.toHaveBeenCalled();
  });
});
