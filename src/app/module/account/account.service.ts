import status from "http-status";
import {
  OnboardingStepValue,
  UserRole,
  VerificationStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { parseStudentId } from "../../utils/student-id";

const createAccount = async (onboardingStepId: string, password: string) => {
  // 1. Load onboarding step with verification request
  const onboardingStep = await prisma.onboardingStep.findUnique({
    where: { id: onboardingStepId },
    include: { verificationRequest: true },
  });

  if (!onboardingStep) {
    throw new AppError(status.NOT_FOUND, "Onboarding session not found.");
  }

  if (onboardingStep.step === OnboardingStepValue.COMPLETED) {
    throw new AppError(
      status.CONFLICT,
      "An account has already been created for this session.",
    );
  }

  if (onboardingStep.step !== OnboardingStepValue.ACCOUNT_CREATION) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot create account at the current stage.",
    );
  }

  const verificationRequest = onboardingStep.verificationRequest;

  if (verificationRequest.status !== VerificationStatus.APPROVED) {
    throw new AppError(
      status.BAD_REQUEST,
      "Verification has not been approved.",
    );
  }

  // 2. Check that a Student with this studentId doesn't already exist
  const existingStudent = await prisma.student.findUnique({
    where: { studentId: verificationRequest.studentId },
  });

  if (existingStudent) {
    throw new AppError(
      status.CONFLICT,
      "A student record with this ID already exists.",
    );
  }

  // 3. Parse student ID to extract academic identity
  const { department, admissionYear, admissionSemester } = parseStudentId(
    verificationRequest.studentId,
  );

  // 4. Create the Better Auth user
  const signUpResult = await auth.api.signUpEmail({
    body: {
      name: verificationRequest.name,
      email: verificationRequest.email,
      password,
      role: UserRole.STUDENT,
    },
  });

  if (!signUpResult || !("user" in signUpResult) || !signUpResult.user) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to create account.",
    );
  }

  const authUser = signUpResult.user;

  // 5. Create Student and mark onboarding as COMPLETED in a transaction
  try {
    await prisma.$transaction(async (tx) => {
      await tx.student.create({
        data: {
          userId: authUser.id,
          studentId: verificationRequest.studentId,
          department,
          admissionYear,
          admissionSemester,
          dateOfBirth: verificationRequest.dateOfBirth,
        },
      });

      await tx.onboardingStep.update({
        where: { id: onboardingStepId },
        data: {
          step: OnboardingStepValue.COMPLETED,
          completedAt: new Date(),
        },
      });
    });
  } catch (error) {
    // Compensating cleanup: delete the orphaned Better Auth user
    try {
      await prisma.user.delete({ where: { id: authUser.id } });
    } catch (cleanupError) {
      console.error("Failed to clean up orphaned user:", cleanupError);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to complete account creation.",
    );
  }

  // 6. Send verification OTP to the user's email
  // Using auth.api.sendVerificationOTP to trigger the OTP flow
  await auth.api.sendVerificationOTP({
    body: {
      email: authUser.email,
      type: "email-verification",
    },
  });

  return {
    userId: authUser.id,
    role: UserRole.STUDENT,
  };
};

export const accountService = {
  createAccount,
};
