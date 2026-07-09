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

/**
 * Checks if the identifier is a valid student ID format.
 * Does not throw - returns boolean only.
 */
const isStudentId = (identifier: string): boolean => {
  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(identifier)) {
    return false;
  }

  const departmentCode = identifier.substring(0, 2);
  const intakeSegment = identifier.substring(4, 7);

  // Check valid department code
  if (!getDepartmentByCode(departmentCode)) {
    return false;
  }

  // Check valid intake code (last 2 digits of 3-digit segment)
  const semesterCode = parseInt(intakeSegment.substring(1), 10);
  return !!ADMISSION_SEMESTER_CODES[semesterCode];
};

const parseStudentId = (studentId: string): ParsedStudentId => {
  // Validate first using isStudentId
  if (!isStudentId(studentId)) {
    throw new AppError(status.BAD_REQUEST, "Invalid student ID format.");
  }

  const departmentCode = studentId.substring(0, 2);
  const yearPart = studentId.substring(2, 4);
  const intakeSegment = studentId.substring(4, 7);
  const serialNumber = parseInt(studentId.substring(7, 11), 10);

  const department = getDepartmentByCode(departmentCode)!; // Safe due to validation
  const admissionYear = 2000 + parseInt(yearPart, 10);
  const semesterCode = parseInt(intakeSegment.substring(1), 10);
  const admissionSemester = ADMISSION_SEMESTER_CODES[semesterCode]; // Safe due to validation

  return {
    department,
    admissionYear,
    admissionSemester,
    serialNumber,
  };
};

export { parseStudentId, isStudentId };
