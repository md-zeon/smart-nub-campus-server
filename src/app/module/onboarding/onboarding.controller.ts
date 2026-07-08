import status from "http-status";
import {
  OnboardingStepValue,
  VerificationStatus,
} from "../../../generated/prisma/enums";
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

  // Build response — only include verificationRequest when request was rejected (for prefilling the form)
  const responseData: Record<string, unknown> = {
    currentStep: step,
    verificationStatus: verificationRequest?.status ?? null,
    note: verificationRequest?.note ?? null,
  };

  // If the request was rejected (for prefilling the form)
  if (verificationRequest?.status === VerificationStatus.REJECTED) {
    responseData.verificationRequest = {
      id: verificationRequest.id,
      name: verificationRequest.name,
      email: verificationRequest.email,
      dateOfBirth: verificationRequest.dateOfBirth,
      studentId: verificationRequest.studentId,
      idCardImage: verificationRequest.idCardImage,
    };
    // If the request was not rejected, we don't include the verificationRequest in the response
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

export const onboardingController = {
  getCurrentStep,
};
