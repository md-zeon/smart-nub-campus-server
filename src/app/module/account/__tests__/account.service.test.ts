import { describe, it, expect, vi, beforeEach } from "vitest";

let mockTx: any;

vi.mock("../../../../app/lib/auth", () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
    },
  },
}));

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    onboardingStep: {
      findUnique: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    verificationRequest: {
      findUnique: vi.fn(),
    },
    user: {
      delete: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fns: unknown) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      mockTx = {
        student: {
          create: vi.fn().mockResolvedValue({}),
        },
        onboardingStep: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fns(mockTx);
    }),
  },
}));

import { prisma } from "../../../../app/lib/prisma";
import { auth } from "../../../../app/lib/auth";
import { accountService } from "../account.service";

const mockPrisma = vi.mocked(prisma);

const studentId = "41241200001"; // CSE, 2024, SUMMER intake

const baseVerificationRequest = {
  id: "vr-1",
  studentId,
  name: "Alice",
  email: "alice@test.com",
  dateOfBirth: new Date("2000-01-01"),
  status: "APPROVED",
  requestType: "STUDENT",
  graduationYear: null,
  degreeTitle: null,
};

const baseOnboardingStep = (verificationRequest = baseVerificationRequest) => ({
  id: "obs-1",
  step: "ACCOUNT_CREATION",
  verificationRequest,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.delete.mockResolvedValue({} as never);
  mockPrisma.verificationRequest.findUnique.mockResolvedValue(
    baseVerificationRequest as never,
  );
  (auth.api.signUpEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "auth-user-1", name: "Alice", email: "alice@test.com" },
  });
});

// ─── createAccount branching (legacy alumni claim vs student) ───────

describe("createAccount branching", () => {
  it("creates a STUDENT account for a STUDENT verification request", async () => {
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(
      baseOnboardingStep() as never,
    );
    mockPrisma.student.findUnique.mockResolvedValue(null);

    const result = await accountService.createAccount("obs-1", "secret123");

    expect(auth.api.signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          role: "STUDENT",
          email: "alice@test.com",
        }),
      }),
    );
    expect(result.user.role).toBe("STUDENT");
    expect(mockTx.student.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "auth-user-1",
        studentId,
        department: "CSE",
        admissionYear: 2024,
        admissionSemester: "SUMMER",
      }),
    });
  });

  it("creates an ALUMNI account for a legacy alumni claim", async () => {
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(
      baseOnboardingStep({
        ...baseVerificationRequest,
        requestType: "ALUMNI",
        graduationYear: 2020,
        degreeTitle: "BSc in CSE",
      }) as never,
    );
    mockPrisma.student.findUnique.mockResolvedValue(null);

    const result = await accountService.createAccount("obs-1", "secret123");

    expect(auth.api.signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ role: "ALUMNI" }),
      }),
    );
    expect(result.user.role).toBe("ALUMNI");
    expect(mockTx.student.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        academicStatus: "GRADUATED",
        graduationYear: 2020,
        degreeTitle: "BSc in CSE",
        transitionConfirmedAt: expect.any(Date),
      }),
    });
  });

  it("does not set graduation fields for a student claim", async () => {
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(
      baseOnboardingStep() as never,
    );
    mockPrisma.student.findUnique.mockResolvedValue(null);

    await accountService.createAccount("obs-1", "secret123");

    expect(mockTx.student.create).toHaveBeenCalledWith({
      data: expect.not.objectContaining({
        academicStatus: expect.anything(),
        graduationYear: expect.anything(),
      }),
    });
  });

  it("throws NOT_FOUND when the onboarding session does not exist", async () => {
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(null);

    await expect(
      accountService.createAccount("obs-1", "secret123"),
    ).rejects.toThrow("Onboarding session not found.");
  });

  it("throws CONFLICT when the session is already completed", async () => {
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(
      { ...baseOnboardingStep(), step: "COMPLETED" } as never,
    );

    await expect(
      accountService.createAccount("obs-1", "secret123"),
    ).rejects.toThrow("An account has already been created for this session.");
  });

  it("throws BAD_REQUEST when verification is not approved", async () => {
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(
      baseOnboardingStep({
        ...baseVerificationRequest,
        status: "PENDING",
      }) as never,
    );

    await expect(
      accountService.createAccount("obs-1", "secret123"),
    ).rejects.toThrow("Verification has not been approved.");
  });

  it("throws CONFLICT when a student with the ID already exists", async () => {
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(
      baseOnboardingStep() as never,
    );
    mockPrisma.student.findUnique.mockResolvedValue({
      id: "existing",
    } as never);

    await expect(
      accountService.createAccount("obs-1", "secret123"),
    ).rejects.toThrow("A student record with this ID already exists.");
  });

  it("throws INTERNAL_SERVER_ERROR when sign-up fails", async () => {
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(
      baseOnboardingStep() as never,
    );
    mockPrisma.student.findUnique.mockResolvedValue(null);
    (auth.api.signUpEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: "email taken",
    });

    await expect(
      accountService.createAccount("obs-1", "secret123"),
    ).rejects.toThrow("Failed to create account.");
  });
});
