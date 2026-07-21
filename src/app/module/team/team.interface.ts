import { ApplicationStatus, TeamRequestStatus } from "../../../generated/prisma/enums";

export interface CreateTeamRequestInput {
  title: string;
  description: string;
  lookingForCount: number;
  projectName?: string;
  deadline?: string;
  category?: string;
  skillTagIds: string[];
}

export interface UpdateTeamRequestInput {
  title?: string;
  description?: string;
  lookingForCount?: number;
  projectName?: string;
  deadline?: string;
  category?: string;
  skillTagIds?: string[];
}

export interface ApplyToTeamInput {
  message?: string;
}

export interface ReviewApplicationInput {
  status: ApplicationStatus;
}

export interface ListTeamRequestsQuery {
  status?: TeamRequestStatus;
  category?: string;
  skill?: string;
  search?: string;
  sort?: "newest" | "oldest" | "popular";
  page?: number;
  limit?: number;
  excludeOwn?: boolean;
}
