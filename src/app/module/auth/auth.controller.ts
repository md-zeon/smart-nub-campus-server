import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { authService } from "./auth.service";

const forgotPassword = catchAsync(async (req, res) => {
  const { identifier } = req.body;

  const result = await authService.forgotPassword(identifier);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { identifier, otp, password } = req.body;

  const result = await authService.resetPassword(identifier, otp, password);

  const httpStatusCode = result.success ? status.OK : status.BAD_REQUEST;

  sendResponse(res, {
    httpStatusCode,
    success: result.success,
    message: result.message,
  });
});

export const authController = {
  forgotPassword,
  resetPassword,
};
