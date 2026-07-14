import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { isStudentId } from "../../utils/student-id";

const isEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const FORGOT_PASSWORD_SUCCESS =
  "If an account exists with that identifier, a password reset code has been sent.";

const RESET_PASSWORD_SUCCESS =
  "Password has been reset successfully. You can now log in.";

const RESET_PASSWORD_ERROR =
  "Failed to reset password. Please try again or request a new code.";

const resolveEmail = async (identifier: string): Promise<string | null> => {
  if (isStudentId(identifier)) {
    const student = await prisma.student.findUnique({
      where: { studentId: identifier },
      select: { user: { select: { email: true } } },
    });

    return student?.user?.email ?? null;
  }

  if (isEmail(identifier)) {
    return identifier;
  }

  return null;
};

const forgotPassword = async (
  identifier: string,
): Promise<{ message: string }> => {
  const email = await resolveEmail(identifier);

  if (!email) {
    return { message: FORGOT_PASSWORD_SUCCESS };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeleted: true },
  });

  if (!user || user.isDeleted) {
    return { message: FORGOT_PASSWORD_SUCCESS };
  }

  try {
    await auth.api.requestPasswordResetEmailOTP({
      body: { email },
    });
  } catch {
    // Silently ignore — always return the same generic message
  }

  return { message: FORGOT_PASSWORD_SUCCESS };
};

const resetPassword = async (
  identifier: string,
  otp: string,
  password: string,
): Promise<{ success: boolean; message: string }> => {
  const email = await resolveEmail(identifier);

  if (!email) {
    return { success: false, message: RESET_PASSWORD_ERROR };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeleted: true },
  });

  if (!user || user.isDeleted) {
    return { success: false, message: RESET_PASSWORD_ERROR };
  }

  try {
    const result = await auth.api.resetPasswordEmailOTP({
      body: { email, otp, password },
    });

    if (!result.success) {
      return { success: false, message: RESET_PASSWORD_ERROR };
    }

    return { success: true, message: RESET_PASSWORD_SUCCESS };
  } catch {
    return { success: false, message: RESET_PASSWORD_ERROR };
  }
};

export const authService = {
  forgotPassword,
  resetPassword,
};
