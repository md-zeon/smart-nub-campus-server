import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGamification: {
    awardBadgeByName: vi.fn().mockResolvedValue(null),
  },
  mockPrisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    userProfile: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    connection: { findFirst: vi.fn(), count: vi.fn() },
    userSkill: { findMany: vi.fn() },
    reputationPoint: { aggregate: vi.fn() },
    userBadge: { findMany: vi.fn(), count: vi.fn() },
    resource: { count: vi.fn() },
    discussion: { count: vi.fn() },
    question: { count: vi.fn() },
    employmentRecord: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: mocks.mockPrisma,
}));

vi.mock("../../../../app/module/gamification/gamification.service", () => ({
  gamificationService: mocks.mockGamification,
}));

import { identityService } from "../identity.service";
import type { RequestUser } from "../identity.interface";

const viewerId = "viewer-001";
const targetId = "target-001";

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: targetId,
  name: "Alice",
  image: "alice.png",
  createdAt: new Date("2025-01-01"),
  gender: "FEMALE",
  student: {
    studentId: "41221100001",
    department: "CSE",
    admissionYear: 2022,
    admissionSemester: "SPRING",
  },
  profile: {
    bio: "Hi",
    coverImage: null,
    location: "Dhaka",
    phoneNumber: null,
    currentSemester: 6,
    batchYear: 2022,
    githubUrl: "github.com/alice",
    linkedinUrl: null,
    portfolioUrl: null,
    websiteUrl: null,
  },
  settings: {
    showProfile: "EVERYONE",
    showAcademicInfo: "EVERYONE",
    showSocialLinks: "EVERYONE",
    showSkills: "EVERYONE",
    showReputation: "EVERYONE",
    showBadges: "EVERYONE",
  },
  ...overrides,
});

const makeRequestUser = (overrides: Partial<RequestUser> = {}): RequestUser => ({
  id: viewerId,
  name: "Bob",
  email: "bob@test.com",
  emailVerified: true,
  image: null,
  role: "STUDENT",
  status: "ACTIVE",
  isDeleted: false,
  gender: null,
  deletedAt: null,
  hasCompletedOnboarding: true,
  isDeactivated: false,
  deactivationRequestedAt: null,
  scheduledDeletionAt: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  student: null,
  admin: null,
  profile: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockGamification.awardBadgeByName.mockResolvedValue(null);
  mocks.mockPrisma.userSkill.findMany.mockResolvedValue([
    { id: "us-1", tag: { id: "tag-1", name: "TypeScript" } },
  ]);
  mocks.mockPrisma.reputationPoint.aggregate.mockResolvedValue({
    _sum: { points: 25 },
  });
  mocks.mockPrisma.connection.count.mockResolvedValue(3);
  mocks.mockPrisma.userBadge.findMany.mockResolvedValue([
    { id: "ub-1", badge: { id: "b-1", name: "Contributor" } },
  ]);
  mocks.mockPrisma.userBadge.count.mockResolvedValue(1);
  mocks.mockPrisma.resource.count.mockResolvedValue(2);
  mocks.mockPrisma.discussion.count.mockResolvedValue(1);
  mocks.mockPrisma.question.count.mockResolvedValue(0);
});

describe("me", () => {
  it("shapes the current user response", () => {
    const user = makeRequestUser({
      id: "u-1",
      name: "Bob",
      student: { id: "s-1" } as never,
      profile: { id: "p-1" } as never,
    });

    const result = identityService.me(user);

    expect(result.user.id).toBe("u-1");
    expect(result.user.email).toBe("bob@test.com");
    expect(result.student).toEqual({ id: "s-1" });
    expect(result.profile).toEqual({ id: "p-1" });
    expect(result.admin).toBeNull();
    expect(Object.keys(result.user)).toEqual([
      "id", "name", "email", "role", "gender", "image", "emailVerified", "status", "createdAt", "updatedAt",
    ]);
  });
});

describe("getProfile", () => {
  it("returns the profile when it exists", async () => {
    mocks.mockPrisma.userProfile.findUnique.mockResolvedValue({
      id: "p-1",
      userId: targetId,
    } as never);

    const result = await identityService.getProfile(targetId);

    expect(result).toEqual({ id: "p-1", userId: targetId });
  });

  it("returns null when no profile exists", async () => {
    mocks.mockPrisma.userProfile.findUnique.mockResolvedValue(null as never);

    const result = await identityService.getProfile(targetId);

    expect(result).toBeNull();
  });
});

describe("getPublicProfile", () => {
  it("throws NOT_FOUND when the user does not exist", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(null as never);

    await expect(
      identityService.getPublicProfile(viewerId, targetId),
    ).rejects.toThrow("User not found.");
  });

  it("throws NOT_FOUND when the profile is ONLY_ME", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(
      makeUser({ settings: { ...makeUser().settings, showProfile: "ONLY_ME" } }) as never,
    );

    await expect(
      identityService.getPublicProfile(viewerId, targetId),
    ).rejects.toThrow("User not found.");
  });

  it("shows everything to the owner when previewing", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(makeUser() as never);

    const result = await identityService.getPublicProfile(
      targetId,
      targetId,
      true,
    );

    expect(result.id).toBe(targetId);
    expect(result.student).toBeDefined();
    expect(result.skills).toHaveLength(1);
    expect(result.stats).toEqual({ totalPoints: 25, connectionCount: 3 });
    expect(result.badges.total).toBe(1);
    expect(result.contentCounts).toEqual({ resources: 2, discussions: 1, questions: 0 });
  });

  it("always includes content counts", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(makeUser() as never);

    const result = await identityService.getPublicProfile(viewerId, targetId);

    expect(result.contentCounts).toEqual({ resources: 2, discussions: 1, questions: 0 });
  });

  it("throws NOT_FOUND for a STUDENTS_ONLY profile viewed by a non-student", async () => {
    mocks.mockPrisma.user.findUnique
      .mockResolvedValueOnce(
        makeUser({ settings: { ...makeUser().settings, showProfile: "STUDENTS_ONLY" } }) as never,
      )
      .mockResolvedValueOnce({ id: viewerId, student: null } as never);

    await expect(
      identityService.getPublicProfile(viewerId, targetId),
    ).rejects.toThrow("User not found.");
  });

  it("allows a STUDENTS_ONLY profile for a student viewer", async () => {
    mocks.mockPrisma.user.findUnique
      .mockResolvedValueOnce(
        makeUser({ settings: { ...makeUser().settings, showProfile: "STUDENTS_ONLY" } }) as never,
      )
      .mockResolvedValueOnce({
        id: viewerId,
        student: { id: "s-1" },
      } as never);

    const result = await identityService.getPublicProfile(viewerId, targetId);

    expect(result.id).toBe(targetId);
  });

  it("allows a CONNECTIONS_ONLY profile when a connection exists", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(
      makeUser({ settings: { ...makeUser().settings, showProfile: "CONNECTIONS_ONLY" } }) as never,
    );
    mocks.mockPrisma.connection.findFirst.mockResolvedValue({
      id: "conn-1",
    } as never);

    const result = await identityService.getPublicProfile(viewerId, targetId);

    expect(result.id).toBe(targetId);
    expect(mocks.mockPrisma.connection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "ACCEPTED" }) }),
    );
  });

  it("hides academic info when set to ONLY_ME", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(
      makeUser({ settings: { ...makeUser().settings, showAcademicInfo: "ONLY_ME" } }) as never,
    );

    const result = await identityService.getPublicProfile(viewerId, targetId);

    expect(result.student).toBeUndefined();
    expect(result.profile).not.toHaveProperty("currentSemester");
    expect(result.profile.bio).toBe("Hi");
  });

  it("hides skills when set to ONLY_ME", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(
      makeUser({ settings: { ...makeUser().settings, showSkills: "ONLY_ME" } }) as never,
    );

    const result = await identityService.getPublicProfile(viewerId, targetId);

    expect(result.skills).toBeUndefined();
  });

  it("hides reputation stats when set to ONLY_ME", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(
      makeUser({ settings: { ...makeUser().settings, showReputation: "ONLY_ME" } }) as never,
    );

    const result = await identityService.getPublicProfile(viewerId, targetId);

    expect(result.stats).toBeUndefined();
  });

  it("hides badges when set to ONLY_ME", async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(
      makeUser({ settings: { ...makeUser().settings, showBadges: "ONLY_ME" } }) as never,
    );

    const result = await identityService.getPublicProfile(viewerId, targetId);

    expect(result.badges).toBeUndefined();
  });
});

describe("updateProfile", () => {
  it("updates the user image when provided", async () => {
    mocks.mockPrisma.user.update.mockResolvedValue({} as never);
    mocks.mockPrisma.userProfile.findUnique.mockResolvedValue({
      id: "p-1",
    } as never);
    mocks.mockPrisma.userProfile.update.mockResolvedValue({} as never);

    await identityService.updateProfile(targetId, { image: "new.png" });

    expect(mocks.mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: targetId },
      data: { image: "new.png" },
    });
  });

  it("updates an existing profile", async () => {
    mocks.mockPrisma.userProfile.findUnique.mockResolvedValue({
      id: "p-1",
    } as never);
    mocks.mockPrisma.userProfile.update.mockResolvedValue({
      id: "p-1",
      bio: "New bio",
    } as never);

    const result = await identityService.updateProfile(targetId, {
      bio: "New bio",
    });

    expect(mocks.mockPrisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId: targetId },
      data: { bio: "New bio" },
    });
    expect(result.bio).toBe("New bio");
  });

  it("creates a profile when none exists", async () => {
    mocks.mockPrisma.userProfile.findUnique.mockResolvedValue(null as never);
    mocks.mockPrisma.userProfile.create.mockResolvedValue({
      id: "p-1",
      userId: targetId,
      bio: "Hello",
    } as never);

    const result = await identityService.updateProfile(targetId, { bio: "Hello" });

    expect(mocks.mockPrisma.userProfile.create).toHaveBeenCalledWith({
      data: { userId: targetId, bio: "Hello" },
    });
    expect(result.id).toBe("p-1");
  });

  it("awards the Mentor badge when opting in as a mentor", async () => {
    mocks.mockPrisma.userProfile.findUnique.mockResolvedValue({
      id: "p-1",
    } as never);
    mocks.mockPrisma.userProfile.update.mockResolvedValue({} as never);

    await identityService.updateProfile(targetId, { isMentor: true });

    expect(mocks.mockGamification.awardBadgeByName).toHaveBeenCalledWith(
      targetId,
      "Mentor",
    );
  });

  it("does not award the Mentor badge otherwise", async () => {
    mocks.mockPrisma.userProfile.findUnique.mockResolvedValue({
      id: "p-1",
    } as never);
    mocks.mockPrisma.userProfile.update.mockResolvedValue({} as never);

    await identityService.updateProfile(targetId, { bio: "x" });

    expect(mocks.mockGamification.awardBadgeByName).not.toHaveBeenCalled();
  });
});

describe("createEmployment", () => {
  it("creates an employment record", async () => {
    mocks.mockPrisma.employmentRecord.create.mockResolvedValue({
      id: "emp-1",
      userId: targetId,
      employer: "ACME",
      title: "Engineer",
    } as never);

    const result = await identityService.createEmployment(targetId, {
      employer: "ACME",
      title: "Engineer",
      startDate: new Date("2024-01-01"),
    });

    expect(mocks.mockPrisma.employmentRecord.create).toHaveBeenCalledWith({
      data: {
        userId: targetId,
        employer: "ACME",
        title: "Engineer",
        startDate: new Date("2024-01-01"),
      },
    });
    expect(result.id).toBe("emp-1");
  });
});

describe("updateEmployment", () => {
  it("throws NOT_FOUND when the record does not belong to the user", async () => {
    mocks.mockPrisma.employmentRecord.findFirst.mockResolvedValue(null as never);

    await expect(
      identityService.updateEmployment(targetId, "emp-1", { title: "Lead" }),
    ).rejects.toThrow("Employment record not found.");
  });

  it("updates an owned employment record", async () => {
    mocks.mockPrisma.employmentRecord.findFirst.mockResolvedValue({
      id: "emp-1",
      userId: targetId,
    } as never);
    mocks.mockPrisma.employmentRecord.update.mockResolvedValue({
      id: "emp-1",
      title: "Lead",
    } as never);

    const result = await identityService.updateEmployment(targetId, "emp-1", {
      title: "Lead",
    });

    expect(mocks.mockPrisma.employmentRecord.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: { title: "Lead" },
    });
    expect(result.title).toBe("Lead");
  });
});

describe("deleteEmployment", () => {
  it("throws NOT_FOUND when the record does not belong to the user", async () => {
    mocks.mockPrisma.employmentRecord.findFirst.mockResolvedValue(null as never);

    await expect(
      identityService.deleteEmployment(targetId, "emp-1"),
    ).rejects.toThrow("Employment record not found.");
  });

  it("deletes an owned employment record", async () => {
    mocks.mockPrisma.employmentRecord.findFirst.mockResolvedValue({
      id: "emp-1",
      userId: targetId,
    } as never);
    mocks.mockPrisma.employmentRecord.delete.mockResolvedValue({} as never);

    const result = await identityService.deleteEmployment(targetId, "emp-1");

    expect(result).toEqual({ message: "Employment record deleted successfully." });
    expect(mocks.mockPrisma.employmentRecord.delete).toHaveBeenCalledWith({
      where: { id: "emp-1" },
    });
  });
});
