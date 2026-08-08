import { describe, it, expect, vi, beforeEach } from "vitest";
import AppError from "../../errorHelpers/AppError";
import verifySession from "../verifySession";
import { createMockRequest, createMockResponse, createMockNext } from "../../../__tests__/utils/test-helpers";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("better-auth/node", () => ({
  fromNodeHeaders: vi.fn((headers: any) => headers),
}));

import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";

const mockPrisma = vi.mocked(prisma);
const mockAuth = vi.mocked(auth);

describe("verifySession middleware", () => {
  let req: ReturnType<typeof createMockRequest>;
  let res: ReturnType<typeof createMockResponse>;
  let next: ReturnType<typeof createMockNext>;

  const validSession = {
    user: { id: "user-001" },
    session: {
      id: "session-001",
      userId: "user-001",
      expiresAt: new Date("2026-12-31T00:00:00Z"),
      token: "token-001",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    },
  };

  const validUser = {
    id: "user-001",
    isDeleted: false,
    isDeactivated: false,
    status: "ACTIVE",
    student: { id: "student-001" },
    admin: null,
    profile: null,
  };

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    vi.clearAllMocks();
  });

  it("calls next() and attaches user/session/student/admin for a valid session", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue(validSession);
    (mockPrisma.user.findUnique as any).mockResolvedValue(validUser);

    await verifySession(req, res, next);

    expect(mockAuth.api.getSession).toHaveBeenCalledWith({
      headers: expect.anything(),
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-001" },
      include: { student: true, admin: true, profile: true },
    });
    expect(req.user).toEqual(validUser);
    expect(req.session).toEqual({
      ...validSession.session,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    expect(req.student).toEqual({ id: "student-001" });
    expect(req.admin).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it("does not attach admin when user has no admin record", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue(validSession);
    (mockPrisma.user.findUnique as any).mockResolvedValue({
      ...validUser,
      admin: { id: "admin-001" },
      student: null,
    });

    await verifySession(req, res, next);

    expect(req.admin).toEqual({ id: "admin-001" });
    expect(req.student).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next() with UNAUTHORIZED AppError when no session is returned", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue(null);

    await verifySession(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("Invalid or expired session.");
    expect(req.user).toBeUndefined();
  });

  it("calls next() with UNAUTHORIZED AppError when session has no user", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue({
      user: null,
      session: validSession.session,
    });

    await verifySession(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("Invalid or expired session.");
  });

  it("calls next() with UNAUTHORIZED AppError when session is missing", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue({
      user: { id: "user-001" },
      session: null,
    });

    await verifySession(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
  });

  it("calls next() with UNAUTHORIZED AppError when user is not found in DB", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue(validSession);
    (mockPrisma.user.findUnique as any).mockResolvedValue(null);

    await verifySession(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("User not found.");
  });

  it("calls next() with FORBIDDEN AppError when user is deleted", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue(validSession);
    (mockPrisma.user.findUnique as any).mockResolvedValue({
      ...validUser,
      isDeleted: true,
    });

    await verifySession(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe(
      "Your account has been deleted. Please contact support.",
    );
  });

  it("calls next() with FORBIDDEN AppError when user is deactivated", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue(validSession);
    (mockPrisma.user.findUnique as any).mockResolvedValue({
      ...validUser,
      isDeactivated: true,
    });

    await verifySession(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe(
      "Your account has been deactivated. Please contact support.",
    );
  });

  it("calls next() with FORBIDDEN AppError when user is banned", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue(validSession);
    (mockPrisma.user.findUnique as any).mockResolvedValue({
      ...validUser,
      status: "BANNED",
    });

    await verifySession(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe(
      "Your account has been banned. Please contact support.",
    );
  });

  it("calls next() with FORBIDDEN AppError when user is suspended", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue(validSession);
    (mockPrisma.user.findUnique as any).mockResolvedValue({
      ...validUser,
      status: "SUSPENDED",
    });

    await verifySession(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe(
      "Your account is suspended. Please contact support.",
    );
  });

  it("defaults missing ipAddress and userAgent to null", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue({
      user: { id: "user-001" },
      session: { id: "session-001", userId: "user-001" },
    });
    (mockPrisma.user.findUnique as any).mockResolvedValue(validUser);

    await verifySession(req, res, next);

    expect(req.session).toEqual({
      id: "session-001",
      userId: "user-001",
      ipAddress: null,
      userAgent: null,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("forwards errors thrown by getSession to next()", async () => {
    const boom = new Error("boom");
    (mockAuth.api.getSession as any).mockRejectedValue(boom);

    await verifySession(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBe(boom);
  });

  it("forwards errors thrown by prisma to next()", async () => {
    (mockAuth.api.getSession as any).mockResolvedValue(validSession);
    const boom = new Error("db down");
    (mockPrisma.user.findUnique as any).mockRejectedValue(boom);

    await verifySession(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBe(boom);
  });
});
