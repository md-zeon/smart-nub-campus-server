import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("better-auth", () => ({
  betterAuth: vi.fn(() => ({ api: { getSession: vi.fn() } })),
}));

vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: vi.fn(() => ({ __adapter: "pg" })),
}));

vi.mock("better-auth/plugins/email-otp", () => ({
  emailOTP: vi.fn((config: any) => config),
}));

vi.mock("better-auth/api", () => ({
  APIError: class APIError extends Error {
    status: string;
    statusCode: string;
    constructor(status: string, options: { message: string }) {
      super(options.message);
      this.status = status;
      this.statusCode = status;
    }
  },
  createAuthMiddleware: vi.fn((fn: any) => fn),
}));

vi.mock("../../../config/env", () => ({
  default: {
    CORS_ORIGINS: ["http://localhost:3000"],
  },
}));

vi.mock("../../../generated/prisma/enums", () => ({
  UserStatus: {
    ACTIVE: "ACTIVE",
    SUSPENDED: "SUSPENDED",
    BANNED: "BANNED",
  },
}));

vi.mock("../../constants/auth", () => ({
  EMAIL_OTP_EXPIRES_IN: 300,
}));

vi.mock("../mail", () => ({
  mailService: {
    sendEmailVerificationOTP: vi.fn(),
    sendPasswordResetOTP: vi.fn(),
  },
}));

vi.mock("../prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "../auth";
import { prisma } from "../prisma";
import { mailService } from "../mail";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const mockPrisma = vi.mocked(prisma);
const mockMail = vi.mocked(mailService);

const authOptions = vi.mocked(betterAuth).mock.calls[0][0] as any;
const beforeHook = authOptions.hooks.before;
const sendVerificationOTP = authOptions.plugins[0].sendVerificationOTP;

const signInCtx = (email = "user@example.com") => ({
  path: "/api/v1/auth/sign-in/email",
  body: { email },
});

const signUpCtx = (email = "user@example.com") => ({
  path: "/api/v1/auth/sign-up/email",
  body: { email },
});

const mockUser = (overrides: Record<string, any> = {}) => ({
  id: "user-001",
  email: "user@example.com",
  isDeleted: false,
  isDeactivated: false,
  status: "ACTIVE",
  emailVerified: true,
  ...overrides,
});

beforeEach(() => {
  mockPrisma.user.findUnique.mockReset();
  mockMail.sendEmailVerificationOTP.mockReset();
  mockMail.sendPasswordResetOTP.mockReset();
});

describe("auth", () => {
  it("creates a better-auth instance with the expected base path and adapter", () => {
    expect(auth).toBeDefined();
    expect(auth.api.getSession).toBeDefined();

    expect(authOptions.basePath).toBe("/api/v1/auth");
    expect(authOptions.database).toEqual({ __adapter: "pg" });
    expect(authOptions.emailAndPassword).toEqual({
      enabled: true,
      requireEmailVerification: true,
    });
    expect(authOptions.trustedOrigins).toEqual(["http://localhost:3000"]);
    expect(prismaAdapter).toHaveBeenCalledWith(mockPrisma, {
      provider: "postgresql",
    });
  });

  it("configures the email OTP plugin with a 300s expiry", () => {
    expect(authOptions.plugins[0].expiresIn).toBe(300);
    expect(authOptions.plugins[0].sendVerificationOnSignUp).toBe(true);
    expect(authOptions.plugins[0].overrideDefaultEmailVerification).toBe(true);
  });
});

describe("auth before hook", () => {
  it("blocks sign-in when the user is deleted", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      mockUser({ isDeleted: true }) as any,
    );

    await expect(beforeHook(signInCtx())).rejects.toMatchObject({
      status: "FORBIDDEN",
      message: "Account not found.",
    });
  });

  it("blocks sign-in when the email is not verified", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      mockUser({ emailVerified: false }) as any,
    );

    await expect(beforeHook(signInCtx())).rejects.toMatchObject({
      status: "FORBIDDEN",
      message: "Please verify your email.",
    });
  });

  it("blocks sign-in when the user is suspended", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      mockUser({ status: "SUSPENDED" }) as any,
    );

    await expect(beforeHook(signInCtx())).rejects.toMatchObject({
      status: "FORBIDDEN",
      message: "Account suspended.",
    });
  });

  it("blocks sign-in when the user is banned", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      mockUser({ status: "BANNED" }) as any,
    );

    await expect(beforeHook(signInCtx())).rejects.toMatchObject({
      status: "FORBIDDEN",
      message: "Account banned.",
    });
  });

  it("blocks sign-in when the user is deactivated", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      mockUser({ isDeactivated: true }) as any,
    );

    await expect(beforeHook(signInCtx())).rejects.toMatchObject({
      status: "FORBIDDEN",
      message: "Account deactivated.",
    });
  });

  it("allows sign-in for a valid user and returns the context", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser() as any);

    const ctx = signInCtx();
    await expect(beforeHook(ctx)).resolves.toBe(ctx);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
  });

  it("allows sign-in when the user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const ctx = signInCtx();
    await expect(beforeHook(ctx)).resolves.toBe(ctx);
  });

  it("blocks sign-up when the email is already registered", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser() as any);

    await expect(beforeHook(signUpCtx())).rejects.toMatchObject({
      status: "CONFLICT",
      message: "User with this email already exists.",
    });
  });

  it("allows sign-up when the email is free", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const ctx = signUpCtx();
    await expect(beforeHook(ctx)).resolves.toBe(ctx);
  });

  it("passes through paths that are not sign-in or sign-up", async () => {
    const ctx = { path: "/api/v1/auth/sign-out", body: {} };
    await expect(beforeHook(ctx)).resolves.toBeUndefined();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("emailOTP sendVerificationOTP", () => {
  it("sends an email verification OTP when the type is email-verification", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-001" } as any);

    await sendVerificationOTP({
      email: "user@example.com",
      otp: "123456",
      type: "email-verification",
    });

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      select: { id: true },
    });
    expect(mockMail.sendEmailVerificationOTP).toHaveBeenCalledWith({
      email: "user@example.com",
      otp: "123456",
    });
    expect(mockMail.sendPasswordResetOTP).not.toHaveBeenCalled();
  });

  it("sends a password reset OTP when the type is forget-password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-001" } as any);

    await sendVerificationOTP({
      email: "user@example.com",
      otp: "654321",
      type: "forget-password",
    });

    expect(mockMail.sendPasswordResetOTP).toHaveBeenCalledWith({
      email: "user@example.com",
      otp: "654321",
    });
    expect(mockMail.sendEmailVerificationOTP).not.toHaveBeenCalled();
  });

  it("does not send any email when the user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await sendVerificationOTP({
      email: "unknown@example.com",
      otp: "000000",
      type: "email-verification",
    });

    expect(mockMail.sendEmailVerificationOTP).not.toHaveBeenCalled();
    expect(mockMail.sendPasswordResetOTP).not.toHaveBeenCalled();
  });

  it("does not send any email for unsupported OTP types", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-001" } as any);

    await sendVerificationOTP({
      email: "user@example.com",
      otp: "000000",
      type: "sign-in",
    });

    expect(mockMail.sendEmailVerificationOTP).not.toHaveBeenCalled();
    expect(mockMail.sendPasswordResetOTP).not.toHaveBeenCalled();
  });
});
