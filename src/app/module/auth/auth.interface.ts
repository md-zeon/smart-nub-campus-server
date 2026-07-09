import { UserRole } from "../../../generated/prisma/enums";

export interface AuthResponse {
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

export interface AuthResult {
  data: AuthResponse;
  headers: Headers;
}
