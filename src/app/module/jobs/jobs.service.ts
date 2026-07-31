import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
  Department,
  JobPostStatus,
  JobType,
  NotificationType,
  UserRole,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { notificationService } from "../notification/notification.service";
import { gamificationService } from "../gamification/gamification.service";
import {
  ApplyJobInput,
  CreateJobInput,
  ListJobsQuery,
  UpdateApplicationInput,
  UpdateJobInput,
} from "./jobs.interface";

const JOB_INCLUDE = {
  postedBy: {
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      profile: {
        select: { jobTitle: true, currentEmployer: true, location: true },
      },
    },
  },
  _count: { select: { applications: true } },
} satisfies Prisma.JobPostInclude;

const APPLICATION_INCLUDE = {
  applicant: {
    select: {
      id: true,
      name: true,
      image: true,
      email: true,
      student: {
        select: {
          department: true,
          graduationYear: true,
        },
      },
      profile: {
        select: { jobTitle: true, currentEmployer: true, location: true },
      },
    },
  },
} satisfies Prisma.JobApplicationInclude;

const ensureOwnerOrAdmin = (
  job: { postedById: string },
  userId: string,
  role: UserRole,
  action: string,
) => {
  if (role !== UserRole.ADMIN && job.postedById !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      `You can only ${action} jobs you posted.`,
    );
  }
};

const listJobs = async (query: ListJobsQuery, userId: string) => {
  const {
    company,
    location,
    employmentType,
    department,
    status: jobStatus,
    q,
    page = 1,
    limit = 12,
  } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.JobPostWhereInput = {};
  where.status = jobStatus
    ? (jobStatus as JobPostStatus)
    : JobPostStatus.OPEN;

  if (employmentType) where.employmentType = employmentType as JobType;
  if (department) where.department = department as Department;
  if (company) where.company = { contains: company, mode: "insensitive" };
  if (location) where.location = { contains: location, mode: "insensitive" };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const [jobs, total] = await prisma.$transaction([
    prisma.jobPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: JOB_INCLUDE,
    }),
    prisma.jobPost.count({ where }),
  ]);

  let jobsWithState = jobs;
  if (userId) {
    const jobIds = jobs.map((job) => job.id);
    const applications = await prisma.jobApplication.findMany({
      where: { jobPostId: { in: jobIds }, applicantId: userId },
      select: { jobPostId: true },
    });
    const appliedSet = new Set(applications.map((app) => app.jobPostId));
    jobsWithState = jobs.map((job) => ({
      ...job,
      appliedByMe: appliedSet.has(job.id),
    }));
  }

  return {
    data: jobsWithState,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getJobById = async (id: string, userId: string) => {
  const job = await prisma.jobPost.findUnique({
    where: { id },
    include: JOB_INCLUDE,
  });

  if (!job) {
    throw new AppError(status.NOT_FOUND, "Job post not found.");
  }

  const application = await prisma.jobApplication.findUnique({
    where: {
      jobPostId_applicantId: { jobPostId: id, applicantId: userId },
    },
    select: { id: true, status: true },
  });

  return { ...job, appliedByMe: !!application, myApplicationStatus: application?.status ?? null };
};

const createJob = async (data: CreateJobInput, userId: string) => {
  const job = await prisma.jobPost.create({
    data: {
      title: data.title,
      company: data.company,
      description: data.description ?? null,
      employmentType: data.employmentType,
      location: data.location ?? null,
      salaryRange: data.salaryRange ?? null,
      applicationUrl: data.applicationUrl ?? null,
      deadline: data.deadline ?? null,
      department: data.department ?? null,
      postedById: userId,
    },
    include: JOB_INCLUDE,
  });

  // Award the "Job Pioneer" badge on first job post (best-effort)
  gamificationService.awardBadgeByName(userId, "Job Pioneer").catch(() => {});

  return job;
};

const updateJob = async (
  id: string,
  data: UpdateJobInput,
  userId: string,
  role: UserRole,
) => {
  const existing = await prisma.jobPost.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Job post not found.");
  }

  ensureOwnerOrAdmin(existing, userId, role, "update");

  const updateData: Prisma.JobPostUpdateInput = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.salaryRange !== undefined) updateData.salaryRange = data.salaryRange;
  if (data.applicationUrl !== undefined) updateData.applicationUrl = data.applicationUrl;
  if (data.deadline !== undefined) updateData.deadline = data.deadline;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.jobPost.update({
    where: { id },
    data: updateData,
    include: JOB_INCLUDE,
  });
};

const deleteJob = async (id: string, userId: string, role: UserRole) => {
  const existing = await prisma.jobPost.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Job post not found.");
  }

  ensureOwnerOrAdmin(existing, userId, role, "delete");

  await prisma.jobPost.delete({ where: { id } });

  return { message: "Job post deleted successfully." };
};

const applyToJob = async (
  jobId: string,
  userId: string,
  data: ApplyJobInput,
) => {
  const job = await prisma.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, company: true, status: true, postedById: true },
  });

  if (!job) {
    throw new AppError(status.NOT_FOUND, "Job post not found.");
  }

  if (job.status !== JobPostStatus.OPEN) {
    throw new AppError(
      status.BAD_REQUEST,
      "This job post is not open for applications.",
    );
  }

  if (job.postedById === userId) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot apply to your own job post.",
    );
  }

  const existing = await prisma.jobApplication.findUnique({
    where: {
      jobPostId_applicantId: { jobPostId: jobId, applicantId: userId },
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      status.CONFLICT,
      "You have already applied to this job.",
    );
  }

  const application = await prisma.jobApplication.create({
    data: {
      jobPostId: jobId,
      applicantId: userId,
      coverLetter: data.coverLetter ?? null,
      resumeUrl: data.resumeUrl ?? null,
    },
    include: {
      applicant: { select: { id: true, name: true, image: true } },
    },
  });

  await notificationService.createNotification({
    userId: job.postedById,
    senderId: userId,
    type: NotificationType.JOB_APPLICATION_RECEIVED,
    title: "New job application",
    message: `${application.applicant.name} applied to "${job.title}" at ${job.company}.`,
    link: `/jobs/${jobId}`,
  });

  return application;
};

const listApplications = async (
  jobId: string,
  userId: string,
  role: UserRole,
) => {
  const job = await prisma.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, postedById: true },
  });

  if (!job) {
    throw new AppError(status.NOT_FOUND, "Job post not found.");
  }

  ensureOwnerOrAdmin(job, userId, role, "view applications for");

  const applications = await prisma.jobApplication.findMany({
    where: { jobPostId: jobId },
    orderBy: { createdAt: "desc" },
    include: APPLICATION_INCLUDE,
  });

  return { job: { id: job.id, title: job.title }, data: applications };
};

const updateApplicationStatus = async (
  jobId: string,
  applicationId: string,
  userId: string,
  role: UserRole,
  data: UpdateApplicationInput,
) => {
  const job = await prisma.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, postedById: true },
  });

  if (!job) {
    throw new AppError(status.NOT_FOUND, "Job post not found.");
  }

  ensureOwnerOrAdmin(job, userId, role, "manage applications for");

  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application || application.jobPostId !== jobId) {
    throw new AppError(status.NOT_FOUND, "Job application not found.");
  }

  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { status: data.status },
    include: {
      applicant: { select: { id: true, name: true, image: true } },
    },
  });

  await notificationService.createNotification({
    userId: application.applicantId,
    senderId: job.postedById,
    type: NotificationType.JOB_APPLICATION_UPDATED,
    title: "Application status updated",
    message: `Your application for "${job.title}" is now ${data.status.toLowerCase()}.`,
    link: `/jobs/${jobId}`,
  });

  return updated;
};

export const jobsService = {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  applyToJob,
  listApplications,
  updateApplicationStatus,
};
