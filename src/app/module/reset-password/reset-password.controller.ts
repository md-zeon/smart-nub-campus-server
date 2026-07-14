import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { resetPasswordService } from "./reset-password.service";

const resetPassword = catchAsync(async (req, res) => {
  const { identifier, otp, password } = req.body;

  const result = await resetPasswordService.resetPassword(
    identifier,
    otp,
    password,
  );

  const httpStatusCode = result.success ? status.OK : status.BAD_REQUEST;

  sendResponse(res, {
    httpStatusCode,
    success: result.success,
    message: result.message,
  });
});

export const resetPasswordController = {
  resetPassword,
};
