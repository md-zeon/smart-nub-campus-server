import { ApplicationStatus, DifficultyLevel, MeetingPreference, TeamRequestStatus } from "../../../generated/prisma/enums";

/** Built-in profile metadata fields a team leader can collect on an application. */
export type ApplicationFormFieldKey =
  | "name"
  | "email"
  | "github"
  | "linkedin"
  | "portfolio"
  | "website"
  | "phone"
  | "location"
  | "studentId"
  | "department"
  | "semester";

export interface ApplicationFormField {
  key: ApplicationFormFieldKey;
  required: boolean;
}

export interface ApplicationFormQuestion {
  id: string;
  label: string;
  type: "SHORT_TEXT" | "PARAGRAPH";
  required: boolean;
}

/** Leader-defined configuration for the application form. */
export interface ApplicationFormConfig {
  fields: ApplicationFormField[];
  questions: ApplicationFormQuestion[];
}

/**
 * Default application form for teams with no stored config (created before
 * this feature): the "why you're a great fit" message plus name/email.
 */
export const DEFAULT_APPLICATION_FORM: ApplicationFormConfig = {
  fields: [
    { key: "name", required: true },
    { key: "email", required: true },
  ],
  questions: [],
};

/** Snapshot of an applicant's answers keyed by field key / question id. */
export type ApplicationResponses = Record<string, string>;

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
  applicationForm?: ApplicationFormConfig;
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
  applicationForm?: ApplicationFormConfig;
  skillTagIds?: string[];
}

export interface ApplyToTeamInput {
  message?: string;
  responses?: ApplicationResponses;
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
