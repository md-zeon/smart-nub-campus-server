import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { securityService } from "./security.service";
import { accountService } from "./account.service";

// ─── Security Controllers ────────────────────────────────────────

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await securityService.changePassword(
    req.user.id,
    currentPassword,
    newPassword,
    req.ip,
  );

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getActiveSessions = catchAsync(async (req, res) => {
  const sessions = await securityService.getActiveSessions(req.user.id);

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Active sessions retrieved successfully.",
    data: sessions,
  });
});

const terminateSession = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await securityService.terminateSession(
    req.user.id,
    id,
    req.ip,
  );

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const terminateOtherSessions = catchAsync(async (req, res) => {
  const currentSessionId = req.session.id;
  const result = await securityService.terminateOtherSessions(
    req.user.id,
    currentSessionId,
    req.ip,
  );

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: { terminatedCount: result.terminatedCount },
  });
});

const getLoginHistory = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await securityService.getLoginHistory(
    req.user.id,
    page,
    limit,
  );

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Login history retrieved successfully.",
    data: result,
  });
});

// ─── Account Controllers ─────────────────────────────────────────

const requestExport = catchAsync(async (req, res) => {
  const { type } = req.body;
  const result = await accountService.requestExport(req.user.id, type);

  sendResponse(res, {
    httpStatusCode: StatusCodes.ACCEPTED,
    success: true,
    message: result.message,
    data: { jobId: result.jobId, status: result.status },
  });
});

const getExportStatus = catchAsync(async (req, res) => {
  const jobId = req.params.jobId as string;
  const result = await accountService.getExportStatus(req.user.id, jobId);

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Export status retrieved successfully.",
    data: result,
  });
});

const downloadExport = catchAsync(async (req, res) => {
  const jobId = req.params.jobId as string;
  const result = await accountService.downloadExport(req.user.id, jobId);

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Download URL generated successfully.",
    data: result,
  });
});

const requestArchive = catchAsync(async (req, res) => {
  const { password } = req.body;
  const result = await accountService.requestArchive(req.user.id, password);

  sendResponse(res, {
    httpStatusCode: StatusCodes.ACCEPTED,
    success: true,
    message: result.message,
    data: { jobId: result.jobId, status: result.status },
  });
});

const deactivateAccount = catchAsync(async (req, res) => {
  const { password } = req.body;
  const result = await accountService.deactivateAccount(
    req.user.id,
    password,
    req.ip,
  );

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: { sessionsInvalidated: result.sessionsInvalidated },
  });
});

const reactivateAccount = catchAsync(async (req, res) => {
  const { password } = req.body;
  const result = await accountService.reactivateAccount(
    req.user.id,
    password,
    req.ip,
  );

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const requestDeletion = catchAsync(async (req, res) => {
  const { password, reason } = req.body;
  const result = await accountService.requestDeletion(
    req.user.id,
    password,
    reason,
    req.ip,
  );

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: { scheduledDeletionAt: result.scheduledDeletionAt },
  });
});

const cancelDeletion = catchAsync(async (req, res) => {
  const result = await accountService.cancelDeletion(req.user.id, req.ip);

  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const settingsController = {
  // Security
  changePassword,
  getActiveSessions,
  terminateSession,
  terminateOtherSessions,
  getLoginHistory,
  // Account
  requestExport,
  getExportStatus,
  downloadExport,
  requestArchive,
  deactivateAccount,
  reactivateAccount,
  requestDeletion,
  cancelDeletion,
};
