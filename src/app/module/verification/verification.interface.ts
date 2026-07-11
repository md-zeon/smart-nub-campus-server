import {
  OnboardingStepValue,
  VerificationStatus,
} from "../../../generated/prisma/enums";

export interface CreateVerificationRequestPayload {
  name: string;
  email: string;
  dateOfBirth: Date;
  studentId: string;
  idCardImage: string;
}

export interface ListVerificationParams {
  page: number;
  limit: number;
  status?: VerificationStatus;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface CreateVerificationRequestResponse {
  currentStep: OnboardingStepValue;
  verificationStatus: VerificationStatus | null;
  note: string | null;
  verificationRequest: {
    id: string;
    name: string;
    email: string;
    dateOfBirth: Date;
    studentId: string;
    status: VerificationStatus;
    note: string | null;
  } | null;
}
