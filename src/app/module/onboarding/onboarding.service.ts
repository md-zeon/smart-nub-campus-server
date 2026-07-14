import status from "http-status";
import { OnboardingStepValue } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

const getCurrentOnboardingState = async (onboardingStepId: string) => {
  // Get onboarding step and associated verification request (if any)
  const onboardingStep = await prisma.onboardingStep.findUnique({
    where: {
      id: onboardingStepId,
    },
    include: {
      verificationRequest: true,
    },
  });

  if (!onboardingStep) {
    return {
      onboardingStep: null,
      verificationRequest: null,
    };
  }

  // Auto-complete if the step is VERIFY_EMAIL and the user's email is already verified
  // This handles the case where the user verified their email on a different page
  // (e.g., /auth/verify-email) and then navigated back to onboarding
  if (
    onboardingStep.step === OnboardingStepValue.VERIFY_EMAIL &&
    onboardingStep.verificationRequest?.email
  ) {
    const user = await prisma.user.findUnique({
      where: { email: onboardingStep.verificationRequest.email },
      select: { emailVerified: true },
    });

    if (user?.emailVerified) {
      const updatedStep = await prisma.onboardingStep.update({
        where: { id: onboardingStepId },
        data: {
          step: OnboardingStepValue.COMPLETED,
          completedAt: new Date(),
        },
      });

      return {
        onboardingStep: { ...onboardingStep, ...updatedStep },
        verificationRequest: onboardingStep.verificationRequest,
      };
    }
  }

  return {
    onboardingStep,
    verificationRequest: onboardingStep.verificationRequest,
  };
};

const completeOnboarding = async (onboardingStepId: string, email: string) => {
  // Validate user exists and email is verified
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user?.emailVerified) {
    throw new AppError(status.FORBIDDEN, "Email not verified.");
  }

  const onboardingStep = await prisma.onboardingStep.findUnique({
    where: { id: onboardingStepId },
  });

  if (!onboardingStep || onboardingStep.step !== OnboardingStepValue.VERIFY_EMAIL) {
    throw new AppError(status.BAD_REQUEST, "Cannot complete onboarding at this stage.");
  }

  await prisma.onboardingStep.update({
    where: { id: onboardingStepId },
    data: {
      step: OnboardingStepValue.COMPLETED,
      completedAt: new Date(),
    },
  });

  return { success: true };
};

export const onboardingService = {
  getCurrentOnboardingState,
  completeOnboarding,
};
