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

export const identityController = {
  me,
};
