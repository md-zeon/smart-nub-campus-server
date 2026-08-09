import {
  ApplicationStatus,
  Department,
  JobPostStatus,
  JobSource,
  JobType,
} from "../../../generated/prisma/enums";

// ── Application form (platform-sourced jobs) ────────────────────────────────
// Mirrors the teams module application form so the same builder/UX is reused.

export type JobApplicationFieldKey =
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

export interface JobApplicationFormField {
  key: JobApplicationFieldKey;
  required: boolean;
}

export interface JobApplicationFormQuestion {
  id: string;
  label: string;
  type: "SHORT_TEXT" | "PARAGRAPH";
  required: boolean;
}

/** Poster-defined configuration for the job application form. */
export interface JobApplicationFormConfig {
  fields: JobApplicationFormField[];
  questions: JobApplicationFormQuestion[];
}

/** Snapshot of an applicant's answers keyed by field key / question id. */
export type JobApplicationResponses = Record<string, string>;

/**
 * Default application form for new jobs (and fallback for jobs created
 * before this feature): name + email, both pre-filled from the applicant's
 * account.
 */
export const DEFAULT_JOB_APPLICATION_FORM: JobApplicationFormConfig = {
  fields: [
    { key: "name", required: true },
    { key: "email", required: true },
  ],
  questions: [],
};

export interface CreateJobInput {
  title: string;
  company: string;
  description?: string;
  employmentType: JobType;
  location?: string;
  salaryRange?: string;
  applicationUrl?: string;
  deadline?: Date;
  department?: Department;
  source?: JobSource;
  sourceUrl?: string;
  applicationForm?: JobApplicationFormConfig;
}

export interface UpdateJobInput {
  title?: string;
  company?: string;
  description?: string;
  employmentType?: JobType;
  location?: string;
  salaryRange?: string;
  applicationUrl?: string;
  deadline?: Date | null;
  department?: Department;
  status?: JobPostStatus;
  source?: JobSource;
  sourceUrl?: string | null;
  applicationForm?: JobApplicationFormConfig | null;
}

export interface ImportJobInput {
  input: string;
}

export interface ListJobsQuery {
  company?: string;
  location?: string;
  employmentType?: string;
  department?: string;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ApplyJobInput {
  coverLetter?: string;
  resumeUrl?: string;
  responses?: JobApplicationResponses;
}

export interface UpdateApplicationInput {
  status: ApplicationStatus;
}
