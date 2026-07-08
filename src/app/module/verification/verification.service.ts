import status from "http-status";
import {
  OnboardingStepValue,
  VerificationStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { CreateVerificationRequestPayload } from "./verification.interface";

const createVerificationRequest = async (
  payload: CreateVerificationRequestPayload,
) => {
  // Existing Request
  const existingRequest = await prisma.verificationRequest.findUnique({
    where: {
      studentId: payload.studentId,
    },
    include: {
      onboardingStep: true,
    },
  });

  // Existing Email
  const existingEmail = await prisma.verificationRequest.findUnique({
    where: {
      email: payload.email,
    },
  });

  // Check if the email is already associated with another verification request
  if (existingEmail && existingEmail.studentId !== payload.studentId) {
    throw new AppError(
      status.CONFLICT,
      "This email is already associated with another verification request.",
    );
  }

  // Existing Request
  if (existingRequest) {
    switch (existingRequest.status) {
      // PENDING or APPROVED: return the existing request and onboarding step without making any changes
      case VerificationStatus.PENDING:
      case VerificationStatus.APPROVED:
        return {
          verificationRequest: existingRequest,
          onboardingStep: existingRequest.onboardingStep,
        };
      // REJECTED: update the existing request and reset the onboarding step
      case VerificationStatus.REJECTED: {
        const updatedRequest = await prisma.$transaction(async (tx) => {
          const verificationRequest = await tx.verificationRequest.update({
            where: {
              id: existingRequest.id,
            },
            data: {
              name: payload.name,
              email: payload.email,
              dateOfBirth: payload.dateOfBirth,
              studentId: payload.studentId,
              idCardImage: payload.idCardImage,
              status: VerificationStatus.PENDING,
              note: null,
            },
          });

          // Reset the onboarding step to ADMIN_REVIEW and set completedAt to null
          const onboardingStep = await tx.onboardingStep.update({
            where: {
              verificationRequestId: existingRequest.id,
            },
            data: {
              step: OnboardingStepValue.ADMIN_REVIEW,
              completedAt: null,
            },
          });

          return {
            verificationRequest,
            onboardingStep,
          };
        });

        return updatedRequest;
      }

      default:
        throw new AppError(status.BAD_REQUEST, "Invalid verification status.");
    }
  }

  // New Request
  const result = await prisma.$transaction(async (tx) => {
    const verificationRequest = await tx.verificationRequest.create({
      data: {
        name: payload.name,
        email: payload.email,
        dateOfBirth: payload.dateOfBirth,
        studentId: payload.studentId,
        idCardImage: payload.idCardImage,
      },
    });

    const onboardingStep = await tx.onboardingStep.create({
      data: {
        verificationRequestId: verificationRequest.id,
        step: OnboardingStepValue.ADMIN_REVIEW,
      },
    });

    return {
      verificationRequest,
      onboardingStep,
    };
  });

  return result;
};

export const verificationService = {
  createVerificationRequest,
};
