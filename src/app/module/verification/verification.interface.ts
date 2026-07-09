import { VerificationStatus } from "../../../generated/prisma/enums";

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
