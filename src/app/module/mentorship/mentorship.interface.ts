import { ApplicationStatus } from "../../../generated/prisma/enums";

export interface ListMentorsQuery {
  department?: string;
  industry?: string;
  topic?: string;
  page?: number;
  limit?: number;
}

export interface CreateMentorshipRequestInput {
  mentorId: string;
  topic?: string;
  message?: string;
}

export interface ListRequestsQuery {
  role?: "mentor" | "mentee";
  status?: string;
  page?: number;
  limit?: number;
}

export interface UpdateMentorshipRequestInput {
  status: ApplicationStatus;
}
