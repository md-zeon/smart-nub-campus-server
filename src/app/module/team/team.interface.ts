import { ApplicationStatus, DifficultyLevel, MeetingPreference, TeamRequestStatus } from "../../../generated/prisma/enums";

export interface CreateTeamRequestInput {
  title: string;
  description: string;
  lookingForCount: number;
  projectName?: string;
  deadline?: string;
  category?: string;
  difficulty?: DifficultyLevel;
  meetingPreference?: MeetingPreference;
  contactInfo?: string;
  skillTagIds: string[];
}

export interface UpdateTeamRequestInput {
  title?: string;
  description?: string;
  lookingForCount?: number;
  status?: "CLOSED";
  projectName?: string;
  deadline?: string;
  category?: string;
  difficulty?: DifficultyLevel;
  meetingPreference?: MeetingPreference;
  contactInfo?: string;
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
  difficulty?: DifficultyLevel;
  meetingPreference?: MeetingPreference;
  skill?: string;
  search?: string;
  sort?: "newest" | "deadline" | "applications";
  page?: number;
  limit?: number;
  excludeOwn?: boolean;
  bookmarked?: boolean;
}

export interface TeamBookmarkInput {
  teamRequestId: string;
}

export interface TeamCategoryCount {
  category: string;
  count: number;
}

export interface TeamPopularSkill {
  tagId: string;
  name: string;
  count: number;
}
