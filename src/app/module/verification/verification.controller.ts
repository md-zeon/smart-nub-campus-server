import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { VerificationStatus } from "../../../generated/prisma/enums";
import { verificationService } from "./verification.service";

const createVerificationRequest = catchAsync(async (req, res) => {
  const result = await verificationService.createVerificationRequest(req.body);

  if (!result.onboardingStep) {
    // This should never happen — the service always creates/returns an onboarding step
    return sendResponse(res, {
      httpStatusCode: httpStatus.INTERNAL_SERVER_ERROR,
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

  // Return the full onboarding state so the frontend can render immediately
  const verificationRequest = result.verificationRequest;
  const responseData: Record<string, unknown> = {
    currentStep: result.onboardingStep.step,
    verificationStatus: verificationRequest?.status ?? null,
    note: verificationRequest?.note ?? null,
  };

  if (verificationRequest) {
    responseData.verificationRequest = {
      id: verificationRequest.id,
      name: verificationRequest.name,
      email: verificationRequest.email,
      dateOfBirth: verificationRequest.dateOfBirth,
      studentId: verificationRequest.studentId,
      status: verificationRequest.status,
      note: verificationRequest.note,
    };
  } else {
    responseData.verificationRequest = null;
  }

  sendResponse(res, {
    httpStatusCode: httpStatus.CREATED,
    success: true,
    message: "Verification request submitted successfully.",
    data: responseData,
  });
});

// Admin methods
const listVerificationRequests = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const statusFilter = req.query.status as VerificationStatus | undefined;
  const search = req.query.search as string | undefined;
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

  const result = await verificationService.listVerificationRequests({
    page,
    limit,
    status: statusFilter,
    search,
    sortBy,
    sortOrder,
  });

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: "Verification requests retrieved successfully.",
    data: result,
  });
});

const getVerificationRequest = catchAsync(async (req, res) => {
  const id = req.params.id as string;

  const result = await verificationService.getVerificationRequest(id);

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: "Verification request retrieved successfully.",
    data: result,
  });
});

const approveVerificationRequest = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const adminId = req.user!.id;

  const result = await verificationService.approveVerificationRequest(
    id,
    adminId,
  );

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: "Verification request approved successfully.",
    data: result,
  });
});

const rejectVerificationRequest = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const { note } = req.body;
  const adminId = req.user!.id;

  const result = await verificationService.rejectVerificationRequest(
    id,
    note,
    adminId,
  );

  sendResponse(res, {
    httpStatusCode: httpStatus.OK,
    success: true,
    message: "Verification request rejected successfully.",
    data: result,
  });
});

export const verificationController = {
  createVerificationRequest,
  listVerificationRequests,
  getVerificationRequest,
  approveVerificationRequest,
  rejectVerificationRequest,
};
