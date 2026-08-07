import { ApplicationStatus } from "../../../generated/prisma/enums";

export interface ListMentorsQuery {
  department?: string;
  industry?: string;
  topic?: string;
  sort?: "relevance" | "name";
  page?: number;
  limit?: number;
}

export interface CreateMentorshipRequestInput {
  mentorId: string;
  topic?: string;
  message?: string;
  goals: string[];
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

export interface ListMentorshipsQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateMentorshipGoalInput {
  title: string;
  description?: string;
  dueDate?: string;
}

export interface UpdateMentorshipGoalInput {
  title?: string;
  description?: string;
  dueDate?: string | null;
  status?: string;
}

export interface CreateMentorshipSessionInput {
  scheduledAt: string;
  durationMinutes?: number;
  format?: string;
  location?: string;
  agenda?: string;
}

export interface UpdateMentorshipSessionInput {
  scheduledAt?: string;
  durationMinutes?: number;
  format?: string;
  location?: string;
  agenda?: string;
  notes?: string;
  actionItems?: string;
  status?: string;
}

export interface SendMentorshipMessageInput {
  body: string;
}

export interface CompleteMentorshipInput {
  feedback?: string;
}

export interface RateMentorInput {
  rating: number;
  feedback?: string;
}
