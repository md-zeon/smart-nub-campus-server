import {
  AdmissionSemester,
  Department,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/enums";

export interface RequestUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  isDeleted: boolean;
  gender: string | null;
  deletedAt: Date | null;
  hasCompletedOnboarding: boolean;
  isDeactivated: boolean;
  deactivationRequestedAt: Date | null;
  scheduledDeletionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    dateOfBirth: Date;
    studentId: string;
    department: Department;
    admissionYear: number;
    admissionSemester: AdmissionSemester;
  } | null;
  admin: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    department: Department | null;
    designation: string | null;
    employeeId: string | null;
    joinedAt: Date;
  } | null;
  profile: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    bio: string | null;
    coverImage: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    websiteUrl: string | null;
    location: string | null;
    phoneNumber: string | null;
    currentSemester: number | null;
    batchYear: number | null;
  } | null;
}
