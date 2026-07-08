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
        role: result.role,
      },
    },
  });
});

export const accountController = {
  createAccount,
};
