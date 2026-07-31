import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { jobsService } from "./jobs.service";
import { ListJobsQuery } from "./jobs.interface";
import { UserRole } from "../../../generated/prisma/enums";

const listJobs = catchAsync(async (req: Request, res: Response) => {
  const query: ListJobsQuery = {
    company: req.query.company as string | undefined,
    location: req.query.location as string | undefined,
    employmentType: req.query.employmentType as string | undefined,
    department: req.query.department as string | undefined,
    status: req.query.status as string | undefined,
    q: req.query.q as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 12,
  };

  const result = await jobsService.listJobs(query, req.user.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Job posts retrieved successfully.",
    data: result,
  });
});

const getJobById = catchAsync(async (req: Request, res: Response) => {
  const result = await jobsService.getJobById(req.params.id as string, req.user.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Job post retrieved successfully.",
    data: result,
  });
});

const createJob = catchAsync(async (req: Request, res: Response) => {
  const result = await jobsService.createJob(req.body, req.user.id);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Job post created successfully.",
    data: result,
  });
});

const updateJob = catchAsync(async (req: Request, res: Response) => {
  const result = await jobsService.updateJob(
    req.params.id as string,
    req.body,
    req.user.id,
    req.user.role as UserRole,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Job post updated successfully.",
    data: result,
  });
});

const deleteJob = catchAsync(async (req: Request, res: Response) => {
  const result = await jobsService.deleteJob(
    req.params.id as string,
    req.user.id,
    req.user.role as UserRole,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const applyToJob = catchAsync(async (req: Request, res: Response) => {
  const result = await jobsService.applyToJob(
    req.params.id as string,
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Application submitted successfully.",
    data: result,
  });
});

const listApplications = catchAsync(async (req: Request, res: Response) => {
  const result = await jobsService.listApplications(
    req.params.id as string,
    req.user.id,
    req.user.role as UserRole,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Job applications retrieved successfully.",
    data: result,
  });
});

const updateApplicationStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await jobsService.updateApplicationStatus(
    req.params.id as string,
    req.params.appId as string,
    req.user.id,
    req.user.role as UserRole,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Application status updated successfully.",
    data: result,
  });
});

export const jobsController = {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  applyToJob,
  listApplications,
  updateApplicationStatus,
};
