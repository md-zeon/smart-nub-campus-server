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

  return {
    onboardingStep,
    verificationRequest: onboardingStep.verificationRequest,
  };
};

export const onboardingService = {
  getCurrentOnboardingState,
};
