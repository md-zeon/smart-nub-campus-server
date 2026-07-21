import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { accountService } from "./account.service";

const createAccount = catchAsync(async (req, res) => {
  const onboardingStepId = req.cookies?.onboarding_step;

  // No cookie found, meaning the user hasn't completed the onboarding process
  if (!onboardingStepId) {
    return sendResponse(res, {
      httpStatusCode: status.UNAUTHORIZED,
      success: false,
      message: "No onboarding session found.",
    });
  }

  const { password } = req.body;
  const result = await accountService.createAccount(onboardingStepId, password);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Account created successfully.",
    data: {
      currentStep: result.currentStep,
      verificationRequest: result.verificationRequest,
      user: {
        id: result.user.userId,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    },
  });
});

const getEmailByStudentId = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await accountService.getEmailByStudentId(id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Email retrieved successfully.",
    data: result,
  });
});

export const accountController = {
  createAccount,
  getEmailByStudentId,
};
