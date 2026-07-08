import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { verificationService } from "./verification.service";

const createVerificationRequest = catchAsync(async (req, res) => {
  const result = await verificationService.createVerificationRequest(req.body);

  if (!result.onboardingStep) {
    // This should never happen — the service always creates/returns an onboarding step
    return sendResponse(res, {
      httpStatusCode: status.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to create onboarding step.",
    });
  }

  // Set onboarding cookie with the onboarding step ID
  res.cookie("onboarding_step", result.onboardingStep.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Verification request submitted successfully.",
    data: {
      currentStep: result.onboardingStep.step,
      verificationStatus: result.verificationRequest?.status ?? null,
    },
  });
});

export const verificationController = {
  createVerificationRequest,
};
