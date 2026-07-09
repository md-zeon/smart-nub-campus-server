import status from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { Student, Admin } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { isStudentId } from "../../utils/student-id";

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: string;
    isDeleted: boolean;
  };
  student: {
    id: string;
    studentId: string;
    department: string;
    admissionYear: number;
    admissionSemester: string;
    dateOfBirth: Date;
  } | null;
  admin: {
    id: string;
    designation: string | null;
    employeeId: string | null;
    department: string | null;
    joinedAt: Date;
  } | null;
}

interface AuthResult {
  data: AuthResponse;
  headers: Headers;
}

const login = async (
  identifier: string,
  password: string,
): Promise<AuthResult> => {
  const email = await getEmailForIdentifier(identifier);

  const { response: signInResult, headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true, // Return headers for session management
  });

  // Better Auth returns user on success, or error on failure
  if (!signInResult || !("user" in signInResult) || !signInResult.user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid credentials.");
  }

  const user = signInResult.user;

  // Load role-specific data
  const student =
    user.role === UserRole.STUDENT
      ? await prisma.student.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            studentId: true,
            department: true,
            admissionYear: true,
            admissionSemester: true,
            dateOfBirth: true,
          },
        })
      : null;

  const admin =
    user.role === UserRole.ADMIN
      ? await prisma.admin.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            designation: true,
            employeeId: true,
            department: true,
            joinedAt: true,
          },
        })
      : null;

  return {
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        status: user.status as string,
        isDeleted: user.isDeleted as boolean,
      },
      student: student
        ? {
            ...student,
            department: student.department as unknown as string,
            admissionSemester: student.admissionSemester as unknown as string,
          }
        : null,
      admin: admin
        ? {
            ...admin,
            department: admin.department as unknown as string | null,
          }
        : null,
    },
    headers,
  };
};

const getEmailForIdentifier = async (identifier: string): Promise<string> => {
  if (isStudentId(identifier)) {
    // Student login via student ID
    const student = await prisma.student.findUnique({
      where: { studentId: identifier },
      include: { user: true },
    });

    if (!student?.user) {
      throw new AppError(
        status.UNAUTHORIZED,
        "Student not found. Account may not be activated.",
      );
    }

    return student.user.email;
  }

  // Email login (any role)
  return identifier;
};

const logout = async (headers: Record<string, string>) => {
  return await auth.api.signOut({
    headers,
    returnHeaders: true, // Return headers for session management
  });
};

const me = (req: {
  user?: {
    id: string;
    role: UserRole;
    name: string;
    email: string;
    status: string;
    isDeleted: boolean;
    student?: Student;
    admin?: Admin;
  };
}) => {
  const user = req.user;

  if (!user) {
    throw new AppError(status.UNAUTHORIZED, "Not authenticated.");
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isDeleted: user.isDeleted,
    },
    student: user.student || null,
    admin: user.admin || null,
  };
};

export const authService = {
  login,
  logout,
  me,
};
