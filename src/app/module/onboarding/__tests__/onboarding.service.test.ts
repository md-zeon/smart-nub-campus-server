import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    onboardingStep: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { onboardingService } from "../onboarding.service";
import { prisma } from "../../../../app/lib/prisma";

const mockPrisma = vi.mocked(prisma);

const stepId = "step-001";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("onboardingService.getCurrentOnboardingState", () => {
  it("returns nulls when the onboarding step does not exist", async () => {
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(null as never);

    const result = await onboardingService.getCurrentOnboardingState(stepId);

    expect(result).toEqual({ onboardingStep: null, verificationRequest: null });
  });

  it("returns the step unchanged when it is not VERIFY_EMAIL", async () => {
    const step = {
      id: stepId,
      step: "ADMIN_REVIEW",
      completedAt: null,
      verificationRequest: { id: "vr-1", email: "a@b.com" },
    };
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(step as never);

    const result = await onboardingService.getCurrentOnboardingState(stepId);

    expect(result.onboardingStep).toEqual(step);
    expect(mockPrisma.onboardingStep.update).not.toHaveBeenCalled();
  });

  it("auto-completes VERIFY_EMAIL when the user email is verified", async () => {
    const step = {
      id: stepId,
      step: "VERIFY_EMAIL",
      completedAt: null,
      verificationRequest: { id: "vr-1", email: "student@nub.ac.bd" },
    };
    const updatedStep = { ...step, step: "COMPLETED", completedAt: expect.any(Date) };
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(step as never);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerified: true,
    } as never);
    mockPrisma.onboardingStep.update.mockResolvedValue(updatedStep as never);

    const result = await onboardingService.getCurrentOnboardingState(stepId);

    expect(mockPrisma.onboardingStep.update).toHaveBeenCalledWith({
      where: { id: stepId },
      data: expect.objectContaining({ step: "COMPLETED" }),
    });
    expect(result.onboardingStep.step).toBe("COMPLETED");
  });

  it("leaves VERIFY_EMAIL untouched when the email is not verified", async () => {
    const step = {
      id: stepId,
      step: "VERIFY_EMAIL",
      completedAt: null,
      verificationRequest: { id: "vr-1", email: "student@nub.ac.bd" },
    };
    mockPrisma.onboardingStep.findUnique.mockResolvedValue(step as never);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerified: false,
    } as never);

    const result = await onboardingService.getCurrentOnboardingState(stepId);

    expect(result.onboardingStep.step).toBe("VERIFY_EMAIL");
    expect(mockPrisma.onboardingStep.update).not.toHaveBeenCalled();
  });
});

describe("onboardingService.completeOnboarding", () => {
  it("throws FORBIDDEN when the user email is not verified", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerified: false,
    } as never);

    await expect(
      onboardingService.completeOnboarding(stepId, "a@b.com"),
    ).rejects.toThrow("Email not verified.");
  });

  it("throws BAD_REQUEST when the step is not VERIFY_EMAIL", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerified: true,
    } as never);
    mockPrisma.onboardingStep.findUnique.mockResolvedValue({
      id: stepId,
      step: "ADMIN_REVIEW",
    } as never);

    await expect(
      onboardingService.completeOnboarding(stepId, "a@b.com"),
    ).rejects.toThrow("Cannot complete onboarding at this stage.");
  });

  it("completes onboarding and creates a missing profile", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerified: true,
    } as never);
    mockPrisma.onboardingStep.findUnique.mockResolvedValue({
      id: stepId,
      step: "VERIFY_EMAIL",
    } as never);
    mockPrisma.onboardingStep.update.mockResolvedValue({} as never);
    mockPrisma.userProfile.findUnique.mockResolvedValue(null as never);
    mockPrisma.userProfile.create.mockResolvedValue({} as never);

    const result = await onboardingService.completeOnboarding(
      stepId,
      "a@b.com",
    );

    expect(result).toEqual({ success: true });
    expect(mockPrisma.onboardingStep.update).toHaveBeenCalledWith({
      where: { id: stepId },
      data: expect.objectContaining({ step: "COMPLETED" }),
    });
    expect(mockPrisma.userProfile.create).toHaveBeenCalledWith({
      data: { userId: "user-1" },
    });
  });

  it("does not create a profile when one already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerified: true,
    } as never);
    mockPrisma.onboardingStep.findUnique.mockResolvedValue({
      id: stepId,
      step: "VERIFY_EMAIL",
    } as never);
    mockPrisma.onboardingStep.update.mockResolvedValue({} as never);
    mockPrisma.userProfile.findUnique.mockResolvedValue({
      id: "profile-1",
    } as never);

    const result = await onboardingService.completeOnboarding(
      stepId,
      "a@b.com",
    );

    expect(result).toEqual({ success: true });
    expect(mockPrisma.userProfile.create).not.toHaveBeenCalled();
  });
});
