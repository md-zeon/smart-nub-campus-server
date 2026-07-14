import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { isStudentId } from "../../utils/student-id";

const GENERIC_SUCCESS_MESSAGE =
  "Password has been reset successfully. You can now log in.";

const GENERIC_ERROR_MESSAGE =
  "Failed to reset password. Please try again or request a new code.";

const isEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const resetPassword = async (
  identifier: string,
  otp: string,
  password: string,
): Promise<{ success: boolean; message: string }> => {
  let email: string;

  if (isStudentId(identifier)) {
    const student = await prisma.student.findUnique({
      where: { studentId: identifier },
      select: { user: { select: { email: true } } },
    });

    if (!student?.user?.email) {
      return { success: false, message: GENERIC_ERROR_MESSAGE };
    }

    email = student.user.email;
  } else if (isEmail(identifier)) {
    email = identifier;
  } else {
    return { success: false, message: GENERIC_ERROR_MESSAGE };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeleted: true },
  });

  if (!user || user.isDeleted) {
    return { success: false, message: GENERIC_ERROR_MESSAGE };
  }

  try {
    const result = await auth.api.resetPasswordEmailOTP({
      body: { email, otp, password },
    });

    if (result.error) {
      return { success: false, message: GENERIC_ERROR_MESSAGE };
    }

    return { success: true, message: GENERIC_SUCCESS_MESSAGE };
  } catch {
    return { success: false, message: GENERIC_ERROR_MESSAGE };
  }
};

export const resetPasswordService = {
  resetPassword,
};
