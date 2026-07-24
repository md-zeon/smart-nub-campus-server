import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { connectionService } from "./connection.service";
import {
  GetMyConnectionsQuery,
  SearchPeopleQuery,
} from "./connection.interface";

const sendConnectionRequest = catchAsync(async (req, res) => {
  const result = await connectionService.sendConnectionRequest(
    req.body,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Connection request sent successfully.",
    data: result,
  });
});

const acceptConnection = catchAsync(async (req, res) => {
  const connectionId = req.params.id as string;
  const result = await connectionService.acceptConnection(
    connectionId,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Connection accepted successfully.",
    data: result,
  });
});

const rejectConnection = catchAsync(async (req, res) => {
  const connectionId = req.params.id as string;
  const result = await connectionService.rejectConnection(
    connectionId,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Connection rejected successfully.",
    data: result,
  });
});

const blockUser = catchAsync(async (req, res) => {
  const result = await connectionService.blockUser(req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const unblockUser = catchAsync(async (req, res) => {
  const blockedId = req.params.blockedId as string;
  const result = await connectionService.unblockUser(blockedId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const removeConnection = catchAsync(async (req, res) => {
  const connectionId = req.params.id as string;
  const result = await connectionService.removeConnection(
    connectionId,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getMyConnections = catchAsync(async (req, res) => {
  const query: GetMyConnectionsQuery = {
    filter:
      (req.query.filter as GetMyConnectionsQuery["filter"]) || "ALL",
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  const result = await connectionService.getMyConnections(req.user.id, query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Connections retrieved successfully.",
    data: result,
  });
});

const getPendingRequests = catchAsync(async (req, res) => {
  const result = await connectionService.getPendingRequests(req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Pending requests retrieved successfully.",
    data: result,
  });
});

const getSentRequests = catchAsync(async (req, res) => {
  const result = await connectionService.getSentRequests(req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Sent requests retrieved successfully.",
    data: result,
  });
});

const toggleFavorite = catchAsync(async (req, res) => {
  const connectionId = req.params.id as string;
  const result = await connectionService.toggleFavorite(
    connectionId,
    req.user.id,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Favorite toggled successfully.",
    data: result,
  });
});

const getSuggestedPeople = catchAsync(async (req, res) => {
  const result = await connectionService.getSuggestedPeople(req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Suggestions retrieved successfully.",
    data: result,
  });
});

const getBlockedUsers = catchAsync(async (req, res) => {
  const result = await connectionService.getBlockedUsers(req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Blocked users retrieved successfully.",
    data: result,
  });
});

const addSkill = catchAsync(async (req, res) => {
  const result = await connectionService.addSkill(req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Skill added successfully.",
    data: result,
  });
});

const removeSkill = catchAsync(async (req, res) => {
  const skillId = req.params.skillId as string;
  const result = await connectionService.removeSkill(skillId, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getUserSkills = catchAsync(async (req, res) => {
  const userId = req.params.userId as string;
  const result = await connectionService.getUserSkills(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Skills retrieved successfully.",
    data: result,
  });
});

const searchPeople = catchAsync(async (req, res) => {
  const query: SearchPeopleQuery = {
    query: req.query.query as string | undefined,
    department: req.query.department as string | undefined,
    semester: req.query.semester as string | undefined,
    skills: req.query.skills
      ? (req.query.skills as string).split(",")
      : undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };
  const result = await connectionService.searchPeople(query, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "People retrieved successfully.",
    data: result,
  });
});

export const connectionController = {
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  blockUser,
  unblockUser,
  removeConnection,
  getMyConnections,
  getPendingRequests,
  getSentRequests,
  toggleFavorite,
  getSuggestedPeople,
  getBlockedUsers,
  addSkill,
  removeSkill,
  getUserSkills,
  searchPeople,
};
