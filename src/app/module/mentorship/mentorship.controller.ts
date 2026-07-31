import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { mentorshipService } from "./mentorship.service";
import { ListMentorsQuery, ListRequestsQuery } from "./mentorship.interface";

const listMentors = catchAsync(async (req: Request, res: Response) => {
  const query: ListMentorsQuery = {
    department: req.query.department as string | undefined,
    industry: req.query.industry as string | undefined,
    topic: req.query.topic as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 12,
  };

  const result = await mentorshipService.listMentors(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Mentors retrieved successfully.",
    data: result,
  });
});

const createMentorshipRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.createMentorshipRequest(
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Mentorship request sent successfully.",
    data: result,
  });
});

const listRequests = catchAsync(async (req: Request, res: Response) => {
  const query: ListRequestsQuery = {
    role: req.query.role as ListRequestsQuery["role"],
    status: req.query.status as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const result = await mentorshipService.listRequests(req.user.id, query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Mentorship requests retrieved successfully.",
    data: result,
  });
});

const updateMentorshipRequest = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.updateMentorshipRequest(
    req.user.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Mentorship request updated successfully.",
    data: result,
  });
});

export const mentorshipController = {
  listMentors,
  createMentorshipRequest,
  listRequests,
  updateMentorshipRequest,
};
