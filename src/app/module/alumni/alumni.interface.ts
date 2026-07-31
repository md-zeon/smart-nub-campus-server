import {
  AcademicStatus,
  AdmissionSemester,
  Department,
} from "../../../generated/prisma/enums";

export interface GraduationInfo {
  studentId: string;
  department: Department;
  admissionYear: number;
  admissionSemester: AdmissionSemester;
  academicStatus: AcademicStatus;
  graduationYear: number | null;
  graduationSemester: AdmissionSemester | null;
  graduationDate: Date | null;
  degreeTitle: string | null;
  cgpa: string | null;
  graduatedAt: Date | null;
  transitionConfirmedAt: Date | null;
  graduatedBy: { id: string; name: string } | null;
}

export interface TransitionStatusResponse {
  eligible: boolean;
  graduation: GraduationInfo | null;
}

export interface DirectoryQuery {
  department?: string;
  graduationYear?: number;
  industry?: string;
  location?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface DirectoryStats {
  total: number;
  byDepartment: { value: string; count: number }[];
  byGraduationYear: { value: number; count: number }[];
  byIndustry: { value: string; count: number }[];
}
