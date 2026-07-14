import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { isStudentId } from "../../utils/student-id";

const isEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists with that identifier, a password reset code has been sent.";

const forgotPassword = async (identifier: string): Promise<{ message: string }> => {
  let email: string;

  if (isStudentId(identifier)) {
    const student = await prisma.student.findUnique({
      where: { studentId: identifier },
      select: { user: { select: { email: true } } },
    });

    if (!student?.user?.email) {
      return { message: GENERIC_SUCCESS_MESSAGE };
    }

    email = student.user.email;
  } else if (isEmail(identifier)) {
    email = identifier;
  } else {
    return { message: GENERIC_SUCCESS_MESSAGE };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeleted: true },
  });

  if (!user || user.isDeleted) {
    return { message: GENERIC_SUCCESS_MESSAGE };
  }

  try {
    await auth.api.requestPasswordResetEmailOTP({
      body: { email },
    });
  } catch {
    // Silently ignore — always return the same generic message
  }

  return { message: GENERIC_SUCCESS_MESSAGE };
};

export const forgotPasswordService = {
  forgotPassword,
};
