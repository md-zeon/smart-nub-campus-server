import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/auth", () => ({
  auth: {
    api: {
      forgetPassword: vi.fn(),
      resetPassword: vi.fn(),
    },
  },
}));

vi.mock("../../../../app/lib/mail", () => ({
  mailService: {
    sendPasswordResetOTP: vi.fn().mockResolvedValue(undefined),
  },
}));

import { forgotPassword, resetPassword } from "../auth.service";
import { auth } from "../../../../app/lib/auth";
import { mailService } from "../../../../app/lib/mail";

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("forgotPassword", () => {
    it("should send password reset OTP successfully", async () => {
      (auth.api.forgetPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: {},
      });

      await forgotPassword("test@example.com");

      expect(auth.api.forgetPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        redirectTo: expect.any(String),
      });
      expect(mailService.sendPasswordResetOTP).toHaveBeenCalledWith(
        "test@example.com"
      );
    });

    it("should throw if forgetPassword API fails", async () => {
      (auth.api.forgetPassword as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API error")
      );

      await expect(forgotPassword("test@example.com")).rejects.toThrow(
        "API error"
      );
      expect(mailService.sendPasswordResetOTP).not.toHaveBeenCalled();
    });

    it("should throw if email is not provided", async () => {
      await expect(forgotPassword("")).rejects.toThrow();
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      (auth.api.resetPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: {},
      });

      await resetPassword("valid-token", "NewP@ssw0rd");

      expect(auth.api.resetPassword).toHaveBeenCalledWith({
        token: "valid-token",
        newPassword: "NewP@ssw0rd",
      });
    });

    it("should throw if resetPassword API fails", async () => {
      (auth.api.resetPassword as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Invalid or expired token")
      );

      await expect(
        resetPassword("bad-token", "NewP@ssw0rd")
      ).rejects.toThrow("Invalid or expired token");
    });

    it("should throw if token is empty", async () => {
      (auth.api.resetPassword as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Token is required")
      );

      await expect(resetPassword("", "NewP@ssw0rd")).rejects.toThrow(
        "Token is required"
      );
    });
  });
});
