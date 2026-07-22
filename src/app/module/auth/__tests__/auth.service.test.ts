import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/auth", () => ({
  auth: {
    api: {
      requestPasswordResetEmailOTP: vi.fn(),
      resetPasswordEmailOTP: vi.fn(),
    },
  },
}));

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
  },
}));

import { authService } from "../auth.service";
import { auth } from "../../../../app/lib/auth";
import { prisma } from "../../../../app/lib/prisma";

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("forgotPassword", () => {
    it("should send password reset OTP for email identifier", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        isDeleted: false,
      });
      (
        auth.api.requestPasswordResetEmailOTP as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      const result = await authService.forgotPassword("test@example.com");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true, isDeleted: true },
      });
      expect(
        auth.api.requestPasswordResetEmailOTP,
      ).toHaveBeenCalledWith({
        body: { email: "test@example.com" },
      });
      expect(result.message).toContain("password reset code has been sent");
    });

    it("should return generic message for non-existent email", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const result = await authService.forgotPassword("unknown@example.com");

      expect(
        auth.api.requestPasswordResetEmailOTP,
      ).not.toHaveBeenCalled();
      expect(result.message).toContain("password reset code has been sent");
    });

    it("should return generic message for deleted user", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        isDeleted: true,
      });

      const result = await authService.forgotPassword("deleted@example.com");

      expect(
        auth.api.requestPasswordResetEmailOTP,
      ).not.toHaveBeenCalled();
      expect(result.message).toContain("password reset code has been sent");
    });

    it("should resolve student ID to email", async () => {
      (prisma.student.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          user: { email: "student@northsouth.edu" },
        },
      );
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-2",
        isDeleted: false,
      });
      (
        auth.api.requestPasswordResetEmailOTP as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      const result = await authService.forgotPassword("41211101234");

      expect(prisma.student.findUnique).toHaveBeenCalledWith({
        where: { studentId: "41211101234" },
        select: { user: { select: { email: true } } },
      });
      expect(
        auth.api.requestPasswordResetEmailOTP,
      ).toHaveBeenCalledWith({
        body: { email: "student@northsouth.edu" },
      });
      expect(result.message).toContain("password reset code has been sent");
    });

    it("should return generic message for invalid identifier", async () => {
      const result = await authService.forgotPassword("not-an-email");

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(
        auth.api.requestPasswordResetEmailOTP,
      ).not.toHaveBeenCalled();
      expect(result.message).toContain("password reset code has been sent");
    });

    it("should handle API errors gracefully", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        isDeleted: false,
      });
      (
        auth.api.requestPasswordResetEmailOTP as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("API error"));

      const result = await authService.forgotPassword("test@example.com");

      expect(result.message).toContain("password reset code has been sent");
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        isDeleted: false,
      });
      (auth.api.resetPasswordEmailOTP as ReturnType<typeof vi.fn>).mockResolvedValue(
        { success: true },
      );

      const result = await authService.resetPassword(
        "test@example.com",
        "123456",
        "NewP@ssw0rd",
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: { id: true, isDeleted: true },
      });
      expect(auth.api.resetPasswordEmailOTP).toHaveBeenCalledWith({
        body: {
          email: "test@example.com",
          otp: "123456",
          password: "NewP@ssw0rd",
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("successfully");
    });

    it("should fail for non-existent email", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const result = await authService.resetPassword(
        "unknown@example.com",
        "123456",
        "NewP@ssw0rd",
      );

      expect(auth.api.resetPasswordEmailOTP).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it("should fail for deleted user", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        isDeleted: true,
      });

      const result = await authService.resetPassword(
        "deleted@example.com",
        "123456",
        "NewP@ssw0rd",
      );

      expect(auth.api.resetPasswordEmailOTP).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it("should fail for invalid OTP", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        isDeleted: false,
      });
      (auth.api.resetPasswordEmailOTP as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Invalid OTP"),
      );

      const result = await authService.resetPassword(
        "test@example.com",
        "000000",
        "NewP@ssw0rd",
      );

      expect(result.success).toBe(false);
    });

    it("should fail when API returns success: false", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        isDeleted: false,
      });
      (auth.api.resetPasswordEmailOTP as ReturnType<typeof vi.fn>).mockResolvedValue(
        { success: false },
      );

      const result = await authService.resetPassword(
        "test@example.com",
        "123456",
        "NewP@ssw0rd",
      );

      expect(result.success).toBe(false);
    });

    it("should resolve student ID to email for reset", async () => {
      (prisma.student.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          user: { email: "student@northsouth.edu" },
        },
      );
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-2",
        isDeleted: false,
      });
      (auth.api.resetPasswordEmailOTP as ReturnType<typeof vi.fn>).mockResolvedValue(
        { success: true },
      );

      const result = await authService.resetPassword(
        "41211101234",
        "123456",
        "NewP@ssw0rd",
      );

      expect(auth.api.resetPasswordEmailOTP).toHaveBeenCalledWith({
        body: {
          email: "student@northsouth.edu",
          otp: "123456",
          password: "NewP@ssw0rd",
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
