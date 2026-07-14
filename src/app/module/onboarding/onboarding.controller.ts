import status from "http-status";
import { OnboardingStepValue } from "../../../generated/prisma/enums";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { onboardingService } from "./onboarding.service";
import { Request, Response } from "express";

const getCurrentStep = catchAsync(async (req: Request, res: Response) => {
  const onboardingStepId = req.cookies?.onboarding_step;

  // No cookie — first time visitor
  if (!onboardingStepId) {
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Onboarding state retrieved successfully.",
      data: {
        currentStep: OnboardingStepValue.VERIFICATION_FORM,
        verificationStatus: null,
        verificationRequest: null,
        note: null,
      },
    });
  }

  const result =
    await onboardingService.getCurrentOnboardingState(onboardingStepId);

  // Invalid or expired cookie
  if (!result.onboardingStep) {
    res.clearCookie("onboarding_step");
    return sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Onboarding state retrieved successfully.",
      data: {
        currentStep: OnboardingStepValue.VERIFICATION_FORM,
        verificationStatus: null,
        verificationRequest: null,
        note: null,
      },
    });
  }

  const { step } = result.onboardingStep;
  const verificationRequest = result.verificationRequest;

  // Build response — always include verificationRequest when it exists
  // Exclude idCardImage to avoid leaking sensitive data to the client
  // Include it only for REJECTED status so the user can preview their previous upload
  const responseData: Record<string, unknown> = {
    currentStep: step,
    verificationStatus: verificationRequest?.status ?? null,
    note: verificationRequest?.note ?? null,
  };

  if (verificationRequest) {
    const vrData: Record<string, unknown> = {
      id: verificationRequest.id,
      name: verificationRequest.name,
      email: verificationRequest.email,
      dateOfBirth: verificationRequest.dateOfBirth,
      studentId: verificationRequest.studentId,
      status: verificationRequest.status,
      note: verificationRequest.note,
    };

    if (verificationRequest.status === "REJECTED") {
      vrData.idCardImage = verificationRequest.idCardImage;
      vrData.idCardImagePublicId = verificationRequest.idCardImagePublicId;
    }

    responseData.verificationRequest = vrData;
  } else {
    responseData.verificationRequest = null;
  }

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Onboarding state retrieved successfully.",
    data: responseData,
  });
});

const completeOnboarding = catchAsync(async (req: Request, res: Response) => {
  const onboardingStepId = req.cookies?.onboarding_step;
  const { email } = req.body;

  if (!onboardingStepId) {
    return sendResponse(res, {
      httpStatusCode: status.UNAUTHORIZED,
      success: false,
      message: "No onboarding session found.",
    });
  }

  await onboardingService.completeOnboarding(onboardingStepId, email);

  res.clearCookie("onboarding_step");

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Onboarding completed successfully.",
    data: { currentStep: OnboardingStepValue.COMPLETED },
  });
});

export const onboardingController = {
  getCurrentStep,
  completeOnboarding,
};
