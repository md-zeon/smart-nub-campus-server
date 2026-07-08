import status from "http-status";
import { AdmissionSemester, Department } from "../../generated/prisma/enums";
import AppError from "../errorHelpers/AppError";
import { getDepartmentByCode } from "../constants/departments";

export interface ParsedStudentId {
  department: Department;
  admissionYear: number;
  admissionSemester: AdmissionSemester;
  serialNumber: number;
}

const ADMISSION_SEMESTER_CODES: Record<number, AdmissionSemester> = {
  10: AdmissionSemester.SPRING,
  20: AdmissionSemester.SUMMER,
  30: AdmissionSemester.FALL,
};

const parseStudentId = (studentId: string): ParsedStudentId => {
  if (!/^\d{11}$/.test(studentId)) {
    throw new AppError(
      status.BAD_REQUEST,
      "Invalid student ID format. Must be exactly 11 digits.",
    );
  }

  const departmentCode = studentId.substring(0, 2);
  const yearPart = studentId.substring(2, 4);
  const intakeSegment = studentId.substring(4, 7);
  const serialNumber = parseInt(studentId.substring(7, 11), 10);

  const department = getDepartmentByCode(departmentCode);
  if (!department) {
    throw new AppError(
      status.BAD_REQUEST,
      `Unknown department code: ${departmentCode}`,
    );
  }

  const admissionYear = 2000 + parseInt(yearPart, 10);

  // Intake segment is 3 digits like "030", we take last 2 digits
  const semesterCode = parseInt(intakeSegment.substring(1), 10);
  const admissionSemester = ADMISSION_SEMESTER_CODES[semesterCode];

  if (!admissionSemester) {
    throw new AppError(
      status.BAD_REQUEST,
      `Unknown intake code: ${intakeSegment}`,
    );
  }

  return {
    department,
    admissionYear,
    admissionSemester,
    serialNumber,
  };
};

export { parseStudentId };
