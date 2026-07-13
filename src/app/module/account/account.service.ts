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

  // 5. Create Student and mark onboarding to verify email in a transaction
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
          step: OnboardingStepValue.VERIFY_EMAIL,
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

  // fetch Verification Request Data for response
  const verificationRequestData = await prisma.verificationRequest.findUnique({
    where: { email: verificationRequest.email },
    select: {
      id: true,
      name: true,
      email: true,
      studentId: true,
      dateOfBirth: true,
      status: true,
      note: true,
    },
  });

  return {
    user: {
      userId: authUser.id,
      name: authUser.name,
      email: authUser.email,
      role: UserRole.STUDENT,
    },
    verificationRequest: verificationRequestData,
    currentStep: OnboardingStepValue.VERIFY_EMAIL,
  };
};

const getEmailByStudentId = async (id: string) => {
  const student = await prisma.student.findUnique({
    where: { studentId: id },
    select: { user: { select: { email: true } } },
  });

  if (!student || !student.user) {
    throw new AppError(
      status.NOT_FOUND,
      "Student with this ID does not exist.",
    );
  }
  return { email: student.user.email };
};

export const accountService = {
  createAccount,
  getEmailByStudentId,
};
