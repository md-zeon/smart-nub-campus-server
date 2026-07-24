import status from "http-status";
import {
  OnboardingStepValue,
  VerificationStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { mailService } from "../../lib/mail";
import { prisma } from "../../lib/prisma";
import { getSocketServer } from "../../lib/socket/socket-server";
import { uploadService } from "../upload/upload.service";
import {
  CreateVerificationRequestPayload,
  ListVerificationParams,
} from "./verification.interface";

// Helper: delete old Cloudinary image if the image changed
const deleteOldImageIfChanged = async (
  oldPublicId: string | null | undefined,
  newImageUrl: string,
  oldImageUrl: string | null | undefined,
) => {
  if (oldPublicId && oldImageUrl && newImageUrl !== oldImageUrl) {
    try {
      await uploadService.delete(oldPublicId);
    } catch (err) {
      console.error("Failed to delete old verification image:", err);
    }
  }
};

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
    // Allow re-submission if the existing request was rejected
    if (existingEmail.status === VerificationStatus.REJECTED) {
      await deleteOldImageIfChanged(
        existingEmail.idCardImagePublicId,
        payload.idCardImage,
        existingEmail.idCardImage,
      );

      const updatedRequest = await prisma.$transaction(async (tx) => {
        const verificationRequest = await tx.verificationRequest.update({
          where: {
            id: existingEmail.id,
          },
          data: {
            name: payload.name,
            email: payload.email,
            dateOfBirth: payload.dateOfBirth,
            studentId: payload.studentId,
            idCardImage: payload.idCardImage,
            idCardImagePublicId: payload.idCardImagePublicId ?? null,
            status: VerificationStatus.PENDING,
            note: null,
          },
        });

        const onboardingStep = await tx.onboardingStep.update({
          where: {
            verificationRequestId: existingEmail.id,
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
        await deleteOldImageIfChanged(
          existingRequest.idCardImagePublicId,
          payload.idCardImage,
          existingRequest.idCardImage,
        );

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
              idCardImagePublicId: payload.idCardImagePublicId ?? null,
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
        idCardImagePublicId: payload.idCardImagePublicId ?? null,
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

// Admin methods
const listVerificationRequests = async (params: ListVerificationParams) => {
  const { page, limit, status, search, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;
  const take = limit;

  const where: {
    status?: VerificationStatus;
    OR?: Array<{
      studentId?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
      name?: { contains: string; mode: "insensitive" };
    }>;
  } = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }

  const [requests, total] = await prisma.$transaction([
    prisma.verificationRequest.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        onboardingStep: true,
      },
    }),
    prisma.verificationRequest.count({ where }),
  ]);

  return {
    data: requests,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getVerificationRequest = async (id: string) => {
  const request = await prisma.verificationRequest.findUnique({
    where: { id },
    include: {
      onboardingStep: true,
    },
  });

  if (!request) {
    throw new AppError(status.NOT_FOUND, "Verification request not found.");
  }

  return request;
};

const approveVerificationRequest = async (id: string, adminId: string) => {
  const request = await prisma.verificationRequest.findUnique({
    where: { id },
    include: { onboardingStep: true },
  });

  if (!request) {
    throw new AppError(status.NOT_FOUND, "Verification request not found.");
  }

  if (request.status !== VerificationStatus.PENDING) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only pending requests can be approved.",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.verificationRequest.update({
      where: { id },
      data: {
        status: VerificationStatus.APPROVED,
        note: null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: { onboardingStep: true },
    });

    if (request.onboardingStep) {
      await tx.onboardingStep.update({
        where: { id: request.onboardingStep.id },
        data: {
          step: OnboardingStepValue.ACCOUNT_CREATION,
        },
      });
    }

    // Fetch the updated onboarding step to return with the result
    const updatedOnboardingStep = await tx.onboardingStep.findUnique({
      where: { verificationRequestId: id },
    });

    return {
      verificationRequest: updatedRequest,
      onboardingStep: updatedOnboardingStep,
    };
  });

  // Send email after transaction commits successfully
  // Use the result entity (committed state) for email data
  if (result.verificationRequest?.email) {
    await mailService.sendVerificationApproved({
      name: result.verificationRequest.name,
      email: result.verificationRequest.email,
    });
  }

  try {
    const io = getSocketServer();
    io.emit("admin:review-update", {
      type: "verification",
      entityId: id,
      status: "APPROVED",
    });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  return result;
};

const rejectVerificationRequest = async (
  id: string,
  note: string,
  adminId: string,
) => {
  const request = await prisma.verificationRequest.findUnique({
    where: { id },
    include: { onboardingStep: true },
  });

  if (!request) {
    throw new AppError(status.NOT_FOUND, "Verification request not found.");
  }

  if (request.status !== VerificationStatus.PENDING) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only pending requests can be rejected.",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.verificationRequest.update({
      where: { id },
      data: {
        status: VerificationStatus.REJECTED,
        note,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: { onboardingStep: true },
    });

    // Keep onboarding step at ADMIN_REVIEW for rejected requests
    return updatedRequest;
  });

  // Send email after transaction commits successfully
  // Use the result entity (committed state) for email data
  if (result.email) {
    await mailService.sendVerificationRejected({
      name: result.name,
      email: result.email,
      note,
    });
  }

  try {
    const io = getSocketServer();
    io.emit("admin:review-update", {
      type: "verification",
      entityId: id,
      status: "REJECTED",
    });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  return { verificationRequest: result, onboardingStep: request.onboardingStep };
};

export const verificationService = {
  createVerificationRequest,
  listVerificationRequests,
  getVerificationRequest,
  approveVerificationRequest,
  rejectVerificationRequest,
};
