import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPrisma,
  mockMailService,
  mockUploadService,
  mockGetSocketServer,
  mockIoEmit,
} = vi.hoisted(() => ({
  mockMailService: {
    send: vi.fn(),
    sendVerificationApproved: vi.fn(),
    sendVerificationRejected: vi.fn(),
    sendEmailVerificationOTP: vi.fn(),
    sendPasswordResetOTP: vi.fn(),
  },
  mockUploadService: {
    delete: vi.fn(),
  },
  mockIoEmit: vi.fn(),
  mockGetSocketServer: vi.fn(),
  mockPrisma: {
    verificationRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    onboardingStep: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../../../../app/lib/mail", () => ({
  mailService: mockMailService,
}));

vi.mock("../../../../app/lib/socket/socket-server", () => ({
  getSocketServer: mockGetSocketServer,
}));

vi.mock("../../upload/upload.service", () => ({
  uploadService: mockUploadService,
}));

import { verificationService } from "../verification.service";
import {
  OnboardingStepValue,
  VerificationRequestType,
  VerificationStatus,
} from "../../../../generated/prisma/enums";
import AppError from "../../../errorHelpers/AppError";

const REQUEST_ID = "req-001";
const ADMIN_ID = "admin-001";
const STUDENT_ID = "STU-001";

const payload = {
  requestType: VerificationRequestType.STUDENT,
  name: "Alice Rahman",
  email: "alice@example.com",
  dateOfBirth: new Date("2000-01-01"),
  studentId: STUDENT_ID,
  idCardImage: "https://res.cloudinary.com/test/image.jpg",
  idCardImagePublicId: "verification/abc123",
  graduationYear: 2025,
  degreeTitle: "BSc in CSE",
};

const onboardingStep = {
  id: "os-001",
  verificationRequestId: REQUEST_ID,
  step: OnboardingStepValue.ADMIN_REVIEW,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseRequest = {
  id: REQUEST_ID,
  requestType: VerificationRequestType.STUDENT,
  name: "Alice Rahman",
  email: "alice@example.com",
  dateOfBirth: new Date("2000-01-01"),
  studentId: STUDENT_ID,
  status: VerificationStatus.PENDING,
  note: null,
  graduationYear: 2025,
  degreeTitle: "BSc in CSE",
  idCardImage: "https://res.cloudinary.com/test/image.jpg",
  idCardImagePublicId: "verification/abc123",
  reviewedById: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  onboardingStep,
};

function mockTxCallback() {
  mockPrisma.$transaction.mockImplementation(async (fns: any) => {
    if (Array.isArray(fns)) {
      return Promise.all(fns);
    }
    return fns(mockPrisma);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockTxCallback();
  mockMailService.sendVerificationApproved.mockResolvedValue({});
  mockMailService.sendVerificationRejected.mockResolvedValue({});
  mockUploadService.delete.mockResolvedValue(true);
  mockGetSocketServer.mockReturnValue({ emit: mockIoEmit });
});

// ─── createVerificationRequest ──────────────────────────────────────────────

describe("createVerificationRequest", () => {
  it("creates a new verification request and onboarding step", async () => {
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const createdRequest = { ...baseRequest, onboardingStep: undefined };
    mockPrisma.verificationRequest.create.mockResolvedValue(createdRequest);
    mockPrisma.onboardingStep.create.mockResolvedValue(onboardingStep);

    const result = await verificationService.createVerificationRequest(payload);

    expect(mockPrisma.verificationRequest.create).toHaveBeenCalledWith({
      data: {
        requestType: payload.requestType,
        name: payload.name,
        email: payload.email,
        dateOfBirth: payload.dateOfBirth,
        studentId: payload.studentId,
        idCardImage: payload.idCardImage,
        idCardImagePublicId: payload.idCardImagePublicId,
        graduationYear: payload.graduationYear,
        degreeTitle: payload.degreeTitle,
      },
    });
    expect(mockPrisma.onboardingStep.create).toHaveBeenCalledWith({
      data: {
        verificationRequestId: REQUEST_ID,
        step: OnboardingStepValue.ADMIN_REVIEW,
      },
    });
    expect(result.verificationRequest).toEqual(createdRequest);
    expect(result.onboardingStep).toEqual(onboardingStep);
  });

  it("defaults optional fields to null when not provided", async () => {
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.verificationRequest.create.mockResolvedValue({
      ...baseRequest,
      onboardingStep: undefined,
    });
    mockPrisma.onboardingStep.create.mockResolvedValue(onboardingStep);

    const { idCardImagePublicId, graduationYear, degreeTitle, ...minimal } =
      payload;
    await verificationService.createVerificationRequest(minimal);

    expect(mockPrisma.verificationRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idCardImagePublicId: null,
        graduationYear: null,
        degreeTitle: null,
      }),
    });
  });

  it("returns the existing pending request without changes", async () => {
    const pending = { ...baseRequest, status: VerificationStatus.PENDING };
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(null);

    const result = await verificationService.createVerificationRequest(payload);

    expect(result.verificationRequest).toEqual(pending);
    expect(result.onboardingStep).toEqual(onboardingStep);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.verificationRequest.update).not.toHaveBeenCalled();
  });

  it("returns the existing approved request without changes", async () => {
    const approved = { ...baseRequest, status: VerificationStatus.APPROVED };
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(approved)
      .mockResolvedValueOnce(null);

    const result = await verificationService.createVerificationRequest(payload);

    expect(result.verificationRequest).toEqual(approved);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("resubmits a previously rejected request and resets status to pending", async () => {
    const rejected = {
      ...baseRequest,
      status: VerificationStatus.REJECTED,
      note: "Unclear photo",
      idCardImage: "https://res.cloudinary.com/test/old.jpg",
      idCardImagePublicId: "verification/old-public",
    };
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(rejected)
      .mockResolvedValueOnce(null);
    const updatedRequest = {
      ...rejected,
      status: VerificationStatus.PENDING,
      note: null,
    };
    mockPrisma.verificationRequest.update.mockResolvedValue(updatedRequest);
    mockPrisma.onboardingStep.update.mockResolvedValue(onboardingStep);

    const result = await verificationService.createVerificationRequest(payload);

    expect(mockPrisma.verificationRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: {
        requestType: payload.requestType,
        name: payload.name,
        email: payload.email,
        dateOfBirth: payload.dateOfBirth,
        studentId: payload.studentId,
        idCardImage: payload.idCardImage,
        idCardImagePublicId: payload.idCardImagePublicId,
        graduationYear: payload.graduationYear,
        degreeTitle: payload.degreeTitle,
        status: VerificationStatus.PENDING,
        note: null,
      },
    });
    expect(mockPrisma.onboardingStep.update).toHaveBeenCalledWith({
      where: { verificationRequestId: REQUEST_ID },
      data: {
        step: OnboardingStepValue.ADMIN_REVIEW,
        completedAt: null,
      },
    });
    expect(result.verificationRequest.status).toBe(VerificationStatus.PENDING);
    expect(mockUploadService.delete).toHaveBeenCalledWith(
      "verification/old-public",
    );
  });

  it("does not delete the old image when the image is unchanged", async () => {
    const rejected = {
      ...baseRequest,
      status: VerificationStatus.REJECTED,
      idCardImage: payload.idCardImage,
      idCardImagePublicId: "verification/abc123",
    };
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(rejected)
      .mockResolvedValueOnce(null);
    mockPrisma.verificationRequest.update.mockResolvedValue({
      ...rejected,
      status: VerificationStatus.PENDING,
    });
    mockPrisma.onboardingStep.update.mockResolvedValue(onboardingStep);

    await verificationService.createVerificationRequest(payload);

    expect(mockUploadService.delete).not.toHaveBeenCalled();
  });

  it("defaults optional fields to null when resubmitting a rejected request", async () => {
    const rejected = {
      ...baseRequest,
      status: VerificationStatus.REJECTED,
      idCardImage: "https://res.cloudinary.com/test/old.jpg",
      idCardImagePublicId: "verification/old-public",
    };
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(rejected)
      .mockResolvedValueOnce(null);
    mockPrisma.verificationRequest.update.mockResolvedValue({
      ...rejected,
      status: VerificationStatus.PENDING,
    });
    mockPrisma.onboardingStep.update.mockResolvedValue(onboardingStep);

    const { idCardImagePublicId, graduationYear, degreeTitle, ...minimal } =
      payload;
    await verificationService.createVerificationRequest(minimal);

    expect(mockPrisma.verificationRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: expect.objectContaining({
        idCardImagePublicId: null,
        graduationYear: null,
        degreeTitle: null,
      }),
    });
  });

  it("defaults optional fields to null when resubmitting on another student's rejected email", async () => {
    const rejectedOther = {
      ...baseRequest,
      id: "req-other",
      studentId: "STU-OTHER",
      status: VerificationStatus.REJECTED,
      email: payload.email,
      idCardImage: "https://res.cloudinary.com/test/other-old.jpg",
      idCardImagePublicId: "verification/other-old",
    };
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(rejectedOther);
    mockPrisma.verificationRequest.update.mockResolvedValue({
      ...rejectedOther,
      status: VerificationStatus.PENDING,
    });
    mockPrisma.onboardingStep.update.mockResolvedValue(onboardingStep);

    const { idCardImagePublicId, graduationYear, degreeTitle, ...minimal } =
      payload;
    await verificationService.createVerificationRequest(minimal);

    expect(mockPrisma.verificationRequest.update).toHaveBeenCalledWith({
      where: { id: "req-other" },
      data: expect.objectContaining({
        idCardImagePublicId: null,
        graduationYear: null,
        degreeTitle: null,
      }),
    });
  });

  it("swallows upload deletion errors during resubmission", async () => {
    const rejected = {
      ...baseRequest,
      status: VerificationStatus.REJECTED,
      idCardImage: "https://res.cloudinary.com/test/old.jpg",
      idCardImagePublicId: "verification/old-public",
    };
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(rejected)
      .mockResolvedValueOnce(null);
    mockUploadService.delete.mockRejectedValue(new Error("cloudinary down"));
    mockPrisma.verificationRequest.update.mockResolvedValue({
      ...rejected,
      status: VerificationStatus.PENDING,
    });
    mockPrisma.onboardingStep.update.mockResolvedValue(onboardingStep);

    const result = await verificationService.createVerificationRequest(payload);

    expect(result.verificationRequest.status).toBe(VerificationStatus.PENDING);
  });

  it("throws CONFLICT when the email belongs to another student's active request", async () => {
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...baseRequest,
        id: "req-other",
        studentId: "STU-OTHER",
        status: VerificationStatus.PENDING,
      });

    const err = await verificationService
      .createVerificationRequest(payload)
      .catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe(
      "This email is already associated with another verification request.",
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("allows resubmission when the email belongs to another student's rejected request", async () => {
    const rejectedOther = {
      ...baseRequest,
      id: "req-other",
      studentId: "STU-OTHER",
      status: VerificationStatus.REJECTED,
      email: payload.email,
      idCardImage: "https://res.cloudinary.com/test/other-old.jpg",
      idCardImagePublicId: "verification/other-old",
    };
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(rejectedOther);
    mockPrisma.verificationRequest.update.mockResolvedValue({
      ...rejectedOther,
      status: VerificationStatus.PENDING,
    });
    mockPrisma.onboardingStep.update.mockResolvedValue(onboardingStep);

    const result = await verificationService.createVerificationRequest(payload);

    expect(mockPrisma.verificationRequest.update).toHaveBeenCalledWith({
      where: { id: "req-other" },
      data: expect.objectContaining({
        status: VerificationStatus.PENDING,
        note: null,
        studentId: payload.studentId,
        email: payload.email,
      }),
    });
    expect(mockPrisma.onboardingStep.update).toHaveBeenCalledWith({
      where: { verificationRequestId: "req-other" },
      data: {
        step: OnboardingStepValue.ADMIN_REVIEW,
        completedAt: null,
      },
    });
    expect(mockUploadService.delete).toHaveBeenCalledWith(
      "verification/other-old",
    );
    expect(result.verificationRequest.status).toBe(VerificationStatus.PENDING);
  });

  it("throws BAD_REQUEST for an existing request with an invalid status", async () => {
    mockPrisma.verificationRequest.findUnique
      .mockResolvedValueOnce({ ...baseRequest, status: "INVALID_STATUS" } as any)
      .mockResolvedValueOnce(null);

    const err = await verificationService
      .createVerificationRequest(payload)
      .catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Invalid verification status.");
  });
});

// ─── listVerificationRequests ───────────────────────────────────────────────

describe("listVerificationRequests", () => {
  it("returns paginated requests with metadata", async () => {
    mockPrisma.verificationRequest.findMany.mockResolvedValue([baseRequest]);
    mockPrisma.verificationRequest.count.mockResolvedValue(3);

    const result = await verificationService.listVerificationRequests({
      page: 1,
      limit: 2,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(REQUEST_ID);
    expect(result.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(mockPrisma.verificationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        skip: 0,
        take: 2,
        orderBy: { createdAt: "desc" },
        include: { onboardingStep: true },
      }),
    );
    expect(mockPrisma.verificationRequest.count).toHaveBeenCalledWith({
      where: {},
    });
  });

  it("applies the status filter", async () => {
    mockPrisma.verificationRequest.findMany.mockResolvedValue([]);
    mockPrisma.verificationRequest.count.mockResolvedValue(0);

    await verificationService.listVerificationRequests({
      page: 1,
      limit: 10,
      status: VerificationStatus.PENDING,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(mockPrisma.verificationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: VerificationStatus.PENDING },
      }),
    );
    expect(mockPrisma.verificationRequest.count).toHaveBeenCalledWith({
      where: { status: VerificationStatus.PENDING },
    });
  });

  it("applies the search filter across studentId, email and name", async () => {
    mockPrisma.verificationRequest.findMany.mockResolvedValue([]);
    mockPrisma.verificationRequest.count.mockResolvedValue(0);

    await verificationService.listVerificationRequests({
      page: 1,
      limit: 10,
      search: "alice",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    const where = {
      OR: [
        { studentId: { contains: "alice", mode: "insensitive" } },
        { email: { contains: "alice", mode: "insensitive" } },
        { name: { contains: "alice", mode: "insensitive" } },
      ],
    };
    expect(mockPrisma.verificationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where }),
    );
    expect(mockPrisma.verificationRequest.count).toHaveBeenCalledWith({
      where,
    });
  });

  it("combines status and search filters and applies pagination offset", async () => {
    mockPrisma.verificationRequest.findMany.mockResolvedValue([]);
    mockPrisma.verificationRequest.count.mockResolvedValue(0);

    await verificationService.listVerificationRequests({
      page: 3,
      limit: 5,
      status: VerificationStatus.REJECTED,
      search: "STU",
      sortBy: "createdAt",
      sortOrder: "asc",
    });

    expect(mockPrisma.verificationRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: VerificationStatus.REJECTED,
          OR: [
            { studentId: { contains: "STU", mode: "insensitive" } },
            { email: { contains: "STU", mode: "insensitive" } },
            { name: { contains: "STU", mode: "insensitive" } },
          ],
        },
        skip: 10,
        take: 5,
      }),
    );
  });
});

// ─── getVerificationRequest ─────────────────────────────────────────────────

describe("getVerificationRequest", () => {
  it("returns the verification request when found", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue(baseRequest);

    const result = await verificationService.getVerificationRequest(REQUEST_ID);

    expect(result).toEqual(baseRequest);
    expect(mockPrisma.verificationRequest.findUnique).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      include: { onboardingStep: true },
    });
  });

  it("throws NOT_FOUND when the request does not exist", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue(null);

    const err = await verificationService
      .getVerificationRequest("missing")
      .catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Verification request not found.");
  });
});

// ─── approveVerificationRequest ─────────────────────────────────────────────

describe("approveVerificationRequest", () => {
  it("approves a pending request and sends email and socket update", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      status: VerificationStatus.PENDING,
    });
    const updatedRequest = {
      ...baseRequest,
      status: VerificationStatus.APPROVED,
      note: null,
      reviewedById: ADMIN_ID,
      reviewedAt: new Date(),
    };
    mockPrisma.verificationRequest.update.mockResolvedValue(updatedRequest);
    mockPrisma.onboardingStep.findUnique.mockResolvedValue({
      ...onboardingStep,
      step: OnboardingStepValue.ACCOUNT_CREATION,
    });

    const result = await verificationService.approveVerificationRequest(
      REQUEST_ID,
      ADMIN_ID,
    );

    expect(mockPrisma.verificationRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: {
        status: VerificationStatus.APPROVED,
        note: null,
        reviewedById: ADMIN_ID,
        reviewedAt: expect.any(Date),
      },
      include: { onboardingStep: true },
    });
    expect(mockPrisma.onboardingStep.update).toHaveBeenCalledWith({
      where: { id: onboardingStep.id },
      data: { step: OnboardingStepValue.ACCOUNT_CREATION },
    });
    expect(mockPrisma.onboardingStep.findUnique).toHaveBeenCalledWith({
      where: { verificationRequestId: REQUEST_ID },
    });
    expect(mockMailService.sendVerificationApproved).toHaveBeenCalledWith({
      name: "Alice Rahman",
      email: "alice@example.com",
    });
    expect(mockIoEmit).toHaveBeenCalledWith("admin:review-update", {
      type: "verification",
      entityId: REQUEST_ID,
      status: "APPROVED",
    });
    expect(result.verificationRequest.status).toBe(VerificationStatus.APPROVED);
    expect(result.onboardingStep.step).toBe(
      OnboardingStepValue.ACCOUNT_CREATION,
    );
  });

  it("throws NOT_FOUND when the request does not exist", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue(null);

    const err = await verificationService
      .approveVerificationRequest("missing", ADMIN_ID)
      .catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Verification request not found.");
  });

  it("throws BAD_REQUEST when the request is not pending", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      status: VerificationStatus.REJECTED,
    });

    const err = await verificationService
      .approveVerificationRequest(REQUEST_ID, ADMIN_ID)
      .catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Only pending requests can be approved.");
    expect(mockPrisma.verificationRequest.update).not.toHaveBeenCalled();
  });

  it("skips onboarding step and email when they are absent", async () => {
    const requestWithoutStep = {
      ...baseRequest,
      email: null,
      onboardingStep: null,
    };
    mockPrisma.verificationRequest.findUnique.mockResolvedValue(
      requestWithoutStep,
    );
    mockPrisma.verificationRequest.update.mockResolvedValue({
      ...requestWithoutStep,
      status: VerificationStatus.APPROVED,
    });
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(null);

    await verificationService.approveVerificationRequest(REQUEST_ID, ADMIN_ID);

    expect(mockPrisma.onboardingStep.update).not.toHaveBeenCalled();
    expect(mockMailService.sendVerificationApproved).not.toHaveBeenCalled();
  });

  it("swallows socket errors when the server is not initialized", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      status: VerificationStatus.PENDING,
    });
    mockPrisma.verificationRequest.update.mockResolvedValue({
      ...baseRequest,
      status: VerificationStatus.APPROVED,
    });
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(onboardingStep);
    mockGetSocketServer.mockImplementation(() => {
      throw new Error("not initialized");
    });

    const result = await verificationService.approveVerificationRequest(
      REQUEST_ID,
      ADMIN_ID,
    );

    expect(result.verificationRequest.status).toBe(VerificationStatus.APPROVED);
  });
});

// ─── rejectVerificationRequest ──────────────────────────────────────────────

describe("rejectVerificationRequest", () => {
  it("rejects a pending request with a note", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      status: VerificationStatus.PENDING,
    });
    const rejected = {
      ...baseRequest,
      status: VerificationStatus.REJECTED,
      note: "Unclear photo",
      reviewedById: ADMIN_ID,
      reviewedAt: new Date(),
    };
    mockPrisma.verificationRequest.update.mockResolvedValue(rejected);

    const result = await verificationService.rejectVerificationRequest(
      REQUEST_ID,
      "Unclear photo",
      ADMIN_ID,
    );

    expect(mockPrisma.verificationRequest.update).toHaveBeenCalledWith({
      where: { id: REQUEST_ID },
      data: {
        status: VerificationStatus.REJECTED,
        note: "Unclear photo",
        reviewedById: ADMIN_ID,
        reviewedAt: expect.any(Date),
      },
      include: { onboardingStep: true },
    });
    expect(mockMailService.sendVerificationRejected).toHaveBeenCalledWith({
      name: "Alice Rahman",
      email: "alice@example.com",
      note: "Unclear photo",
    });
    expect(mockIoEmit).toHaveBeenCalledWith("admin:review-update", {
      type: "verification",
      entityId: REQUEST_ID,
      status: "REJECTED",
    });
    expect(result.verificationRequest.status).toBe(VerificationStatus.REJECTED);
    expect(result.verificationRequest.note).toBe("Unclear photo");
    expect(result.onboardingStep).toEqual(onboardingStep);
  });

  it("throws NOT_FOUND when the request does not exist", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue(null);

    const err = await verificationService
      .rejectVerificationRequest("missing", "note", ADMIN_ID)
      .catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Verification request not found.");
  });

  it("throws BAD_REQUEST when the request is not pending", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      status: VerificationStatus.APPROVED,
    });

    const err = await verificationService
      .rejectVerificationRequest(REQUEST_ID, "note", ADMIN_ID)
      .catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Only pending requests can be rejected.");
    expect(mockPrisma.verificationRequest.update).not.toHaveBeenCalled();
  });

  it("skips the rejection email when the request has no email", async () => {
    const requestWithoutEmail = { ...baseRequest, email: null };
    mockPrisma.verificationRequest.findUnique.mockResolvedValue({
      ...requestWithoutEmail,
      status: VerificationStatus.PENDING,
    });
    mockPrisma.verificationRequest.update.mockResolvedValue({
      ...requestWithoutEmail,
      status: VerificationStatus.REJECTED,
      note: "Unclear photo",
    });

    await verificationService.rejectVerificationRequest(
      REQUEST_ID,
      "Unclear photo",
      ADMIN_ID,
    );

    expect(mockMailService.sendVerificationRejected).not.toHaveBeenCalled();
  });

  it("swallows socket errors when the server is not initialized", async () => {
    mockPrisma.verificationRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      status: VerificationStatus.PENDING,
    });
    mockPrisma.verificationRequest.update.mockResolvedValue({
      ...baseRequest,
      status: VerificationStatus.REJECTED,
      note: "Unclear photo",
    });
    mockGetSocketServer.mockImplementation(() => {
      throw new Error("not initialized");
    });

    const result = await verificationService.rejectVerificationRequest(
      REQUEST_ID,
      "Unclear photo",
      ADMIN_ID,
    );

    expect(result.verificationRequest.status).toBe(VerificationStatus.REJECTED);
  });
});
