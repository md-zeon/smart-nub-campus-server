import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { forgotPasswordService } from "./forgot-password.service";

const forgotPassword = catchAsync(async (req, res) => {
  const { identifier } = req.body;

  const result = await forgotPasswordService.forgotPassword(identifier);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
  });
});

export const forgotPasswordController = {
  forgotPassword,
};
