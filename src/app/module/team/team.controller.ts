import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { teamService } from "./team.service";
import { ListTeamRequestsQuery } from "./team.interface";

const createTeamRequest = catchAsync(async (req, res) => {
  const result = await teamService.createTeamRequest(req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Team request created successfully.",
    data: result,
  });
});

const getTeamRequest = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await teamService.getTeamRequest(id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Team request retrieved successfully.",
    data: result,
  });
});

const listTeamRequests = catchAsync(async (req, res) => {
  const query: ListTeamRequestsQuery = {
    status: req.query.status as ListTeamRequestsQuery["status"],
    category: req.query.category as string | undefined,
    skill: req.query.skill as string | undefined,
    search: req.query.search as string | undefined,
    sort: (req.query.sort as ListTeamRequestsQuery["sort"]) || "newest",
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 12,
    excludeOwn: req.query.excludeOwn === "true",
  };

  const result = await teamService.listTeamRequests(query, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Team requests retrieved successfully.",
    data: result,
  });
});

const updateTeamRequest = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await teamService.updateTeamRequest(id, req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Team request updated successfully.",
    data: result,
  });
});

const deleteTeamRequest = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await teamService.deleteTeamRequest(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const applyToTeam = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await teamService.applyToTeam(id, req.user.id, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Application submitted successfully.",
    data: result,
  });
});

const reviewApplication = catchAsync(async (req, res) => {
  const teamRequestId = req.params.id as string;
  const applicationId = req.params.applicationId as string;
  const result = await teamService.reviewApplication(
    teamRequestId,
    applicationId,
    req.body.status,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Application reviewed successfully.",
    data: result,
  });
});

const withdrawApplication = catchAsync(async (req, res) => {
  const teamRequestId = req.params.id as string;
  const result = await teamService.withdrawApplication(teamRequestId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Application withdrawn successfully.",
    data: result,
  });
});

const getTeamMembers = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await teamService.getTeamMembers(id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Team members retrieved successfully.",
    data: result,
  });
});

const leaveTeam = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await teamService.leaveTeam(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const removeMember = catchAsync(async (req, res) => {
  const teamRequestId = req.params.id as string;
  const memberId = req.params.memberId as string;
  const result = await teamService.removeMember(teamRequestId, memberId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const teamController = {
  createTeamRequest,
  getTeamRequest,
  listTeamRequests,
  updateTeamRequest,
  deleteTeamRequest,
  applyToTeam,
  reviewApplication,
  withdrawApplication,
  getTeamMembers,
  leaveTeam,
  removeMember,
};
