import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { settingsService } from "./settings.service";

const getPrivacySettings = catchAsync(async (req: Request, res: Response) => {
  const result = await settingsService.getPrivacySettings(req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Privacy settings retrieved successfully.",
    data: result,
  });
});

const updatePrivacySettings = catchAsync(async (req: Request, res: Response) => {
  const result = await settingsService.updatePrivacySettings(
    req.user.id,
    req.body,
  );
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Privacy settings updated successfully.",
    data: result,
  });
});

const getNotificationSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await settingsService.getNotificationSettings(req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Notification settings retrieved successfully.",
    data: result,
  });
});

const updateNotificationSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await settingsService.updateNotificationSettings(
    req.user.id,
    req.body,
  );
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Notification settings updated successfully.",
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const headers = req.headers as Record<string, string>;
  await settingsService.changePassword(req.user.id, req.body, headers);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Password changed successfully.",
  });
});

const getActiveSessions = catchAsync(async (req: Request, res: Response) => {
  const result = await settingsService.getActiveSessions(
    req.user.id,
    req.session.id,
  );
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Active sessions retrieved successfully.",
    data: result,
  });
});

const terminateSession = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  await settingsService.terminateSession(
    req.user.id,
    sessionId,
    req.session.id,
  );
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Session terminated successfully.",
  });
});

const terminateOtherSessions = catchAsync(async (req: Request, res: Response) => {
  await settingsService.terminateOtherSessions(req.user.id, req.session.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Other sessions terminated successfully.",
  });
});

const getLoginHistory = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await settingsService.getLoginHistory(req.user.id, page, limit);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Login history retrieved successfully.",
    data: result,
  });
});

const requestExport = catchAsync(async (req: Request, res: Response) => {
  const result = await settingsService.requestExport(req.user.id, req.body);
  sendResponse(res, {
    httpStatusCode: StatusCodes.ACCEPTED,
    success: true,
    message: "Data export request accepted.",
    data: result,
  });
});

const getExportStatus = catchAsync(async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;
  const result = await settingsService.getExportStatus(
    req.user.id,
    jobId,
  );
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Export status retrieved.",
    data: result,
  });
});

const downloadExport = catchAsync(async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;
  const result = await settingsService.downloadExport(
    req.user.id,
    jobId,
  );
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Export download URL retrieved.",
    data: result,
  });
});

const requestArchive = catchAsync(async (req: Request, res: Response) => {
  const result = await settingsService.requestArchive(req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.ACCEPTED,
    success: true,
    message: "Archive request accepted.",
    data: result,
  });
});

const deactivateAccount = catchAsync(async (req: Request, res: Response) => {
  await settingsService.deactivateAccount(req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message:
      "Account deactivated. You have been signed out from all sessions.",
  });
});

const reactivateAccount = catchAsync(async (req: Request, res: Response) => {
  await settingsService.reactivateAccount(req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Account reactivated successfully.",
  });
});

const requestDeletion = catchAsync(async (req: Request, res: Response) => {
  const result = await settingsService.requestDeletion(
    req.user.id,
    req.body.password,
    req.body.reason,
  );
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message:
      "Account deletion scheduled. You have 30 days to cancel before permanent deletion.",
    data: result,
  });
});

const cancelDeletion = catchAsync(async (req: Request, res: Response) => {
  await settingsService.cancelDeletion(req.user.id);
  sendResponse(res, {
    httpStatusCode: StatusCodes.OK,
    success: true,
    message: "Account deletion cancelled successfully.",
  });
});

export const settingsController = {
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  changePassword,
  getActiveSessions,
  terminateSession,
  terminateOtherSessions,
  getLoginHistory,
  requestExport,
  getExportStatus,
  downloadExport,
  requestArchive,
  deactivateAccount,
  reactivateAccount,
  requestDeletion,
  cancelDeletion,
};
