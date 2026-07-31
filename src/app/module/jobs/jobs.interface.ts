import {
  ApplicationStatus,
  Department,
  JobPostStatus,
  JobType,
} from "../../../generated/prisma/enums";

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
}

export interface UpdateApplicationInput {
  status: ApplicationStatus;
}
