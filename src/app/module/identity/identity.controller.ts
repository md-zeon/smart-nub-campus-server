import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { identityService } from "./identity.service";
import { RequestUser } from "./identity.interface";

const me = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = identityService.me(user);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User retrieved successfully.",
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await identityService.getProfile(user.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile retrieved successfully.",
    data: result,
  });
});

const getPublicProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await identityService.getPublicProfile(userId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile retrieved successfully.",
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await identityService.updateProfile(user.id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile updated successfully.",
    data: result,
  });
});

export const identityController = {
  me,
  getMyProfile,
  getPublicProfile,
  updateProfile,
};
