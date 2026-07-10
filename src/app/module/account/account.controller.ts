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

  // Clear the onboarding cookie — account creation is complete
  res.clearCookie("onboarding_step");

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Account created successfully.",
    data: {
      currentStep: "COMPLETED",
      user: {
        id: result.userId,
        name: result.name,
        email: result.email,
        role: result.role,
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
