import {
  OnboardingStepValue,
  VerificationRequestType,
  VerificationStatus,
} from "../../../generated/prisma/enums";

export interface CreateVerificationRequestPayload {
  requestType: VerificationRequestType;
  name: string;
  email: string;
  dateOfBirth: Date;
  studentId: string;
  idCardImage: string;
  idCardImagePublicId?: string;
  graduationYear?: number;
  degreeTitle?: string;
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
    requestType: VerificationRequestType;
    graduationYear: number | null;
    degreeTitle: string | null;
    idCardImage?: string;
    idCardImagePublicId?: string | null;
  } | null;
}
