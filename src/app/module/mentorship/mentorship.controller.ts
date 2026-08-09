import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { mentorshipService } from "./mentorship.service";
import {
  ListMentorsQuery,
  ListMentorshipsQuery,
  ListRequestsQuery,
} from "./mentorship.interface";

const listMentors = catchAsync(async (req: Request, res: Response) => {
  const query: ListMentorsQuery = {
    department: req.query.department as string | undefined,
    industry: req.query.industry as string | undefined,
    topic: req.query.topic as string | undefined,
    sort: req.query.sort as ListMentorsQuery["sort"],
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 12,
  };

  const result = await mentorshipService.listMentors(query, req.user.id);

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

const listMentorships = catchAsync(async (req: Request, res: Response) => {
  const query: ListMentorshipsQuery = {
    status: req.query.status as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const result = await mentorshipService.listMentorships(req.user.id, query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Mentorships retrieved successfully.",
    data: result,
  });
});

const getMentorship = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.getMentorship(
    req.user.id,
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Mentorship retrieved successfully.",
    data: result,
  });
});

const createGoal = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.createGoal(
    req.user.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Goal added successfully.",
    data: result,
  });
});

const updateGoal = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.updateGoal(
    req.user.id,
    req.params.goalId as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Goal updated successfully.",
    data: result,
  });
});

const deleteGoal = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.deleteGoal(
    req.user.id,
    req.params.goalId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Goal deleted successfully.",
    data: result,
  });
});

const createSession = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.createSession(
    req.user.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Session scheduled successfully.",
    data: result,
  });
});

const updateSession = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.updateSession(
    req.user.id,
    req.params.sessionId as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Session updated successfully.",
    data: result,
  });
});

const listMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.listMessages(
    req.user.id,
    req.params.id as string,
    req.query.before as string | undefined,
    parseInt(req.query.limit as string) || 50,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Messages retrieved successfully.",
    data: result,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.sendMessage(
    req.user.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Message sent successfully.",
    data: result,
  });
});

const completeMentorship = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.completeMentorship(
    req.user.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Mentorship marked as complete.",
    data: result,
  });
});

const rateMentor = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.rateMentor(
    req.user.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Mentor rated successfully.",
    data: result,
  });
});

const endMentorship = catchAsync(async (req: Request, res: Response) => {
  const result = await mentorshipService.endMentorship(
    req.user.id,
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Mentorship ended.",
    data: result,
  });
});

export const mentorshipController = {
  listMentors,
  createMentorshipRequest,
  listRequests,
  updateMentorshipRequest,
  listMentorships,
  getMentorship,
  createGoal,
  updateGoal,
  deleteGoal,
  createSession,
  updateSession,
  listMessages,
  sendMessage,
  completeMentorship,
  rateMentor,
  endMentorship,
};
