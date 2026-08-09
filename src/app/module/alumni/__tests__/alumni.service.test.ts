import { describe, it, expect, vi, beforeEach } from "vitest";

let mockBadgeFound = true;
let mockBadgeAlreadyOwned = false;
let mockTx: any;

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    badge: {
      findUnique: vi.fn(),
    },
    userBadge: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    connection: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fns: unknown) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      mockTx = {
        user: { update: vi.fn().mockResolvedValue({}) },
        student: { update: vi.fn().mockResolvedValue({}) },
        userProfile: {
          findUnique: vi.fn().mockResolvedValue({ batchYear: null }),
          update: vi.fn().mockResolvedValue({}),
        },
        badge: {
          findUnique: vi.fn().mockResolvedValue(
            mockBadgeFound ? { id: "badge-alumnus" } : null,
          ),
        },
        userBadge: {
          findUnique: vi
            .fn()
            .mockResolvedValue(mockBadgeAlreadyOwned ? { id: "ub-1" } : null),
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return fns(mockTx);
    }),
  },
}));

import { prisma } from "../../../../app/lib/prisma";
import { alumniService } from "../alumni.service";

const mockPrisma = vi.mocked(prisma);

const studentId = "41241200001";
const userId = "user-001";
const targetUserId = "user-002";
const adminId = "admin-001";

const graduatedStudent = {
  id: "student-1",
  studentId,
  department: "CSE",
  admissionYear: 2024,
  admissionSemester: "SUMMER",
  academicStatus: "GRADUATED",
  graduationYear: 2026,
  graduationSemester: "FALL",
  graduationDate: new Date("2026-12-31"),
  degreeTitle: "BSc in CSE",
  cgpa: "3.75",
  graduatedAt: new Date("2026-12-31"),
  transitionConfirmedAt: null,
  graduatedBy: { id: adminId, name: "Admin" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockBadgeFound = true;
  mockBadgeAlreadyOwned = false;
});

// ─── getTransitionStatus ────────────────────────────────────────────

describe("getTransitionStatus", () => {
  it("reports eligible when academicStatus is GRADUATED", async () => {
    mockPrisma.student.findUnique.mockResolvedValue(graduatedStudent as never);

    const result = await alumniService.getTransitionStatus(userId);

    expect(result.eligible).toBe(true);
    expect(result.graduation.graduationYear).toBe(2026);
    expect(result.graduation.department).toBe("CSE");
  });

  it("reports not eligible when still enrolled", async () => {
    mockPrisma.student.findUnique.mockResolvedValue({
      ...graduatedStudent,
      academicStatus: "ENROLLED",
      graduationYear: null,
    } as never);

    const result = await alumniService.getTransitionStatus(userId);

    expect(result.eligible).toBe(false);
    expect(result.graduation.graduationYear).toBeNull();
  });

  it("throws NOT_FOUND when student record is missing", async () => {
    mockPrisma.student.findUnique.mockResolvedValue(null);

    await expect(alumniService.getTransitionStatus(userId)).rejects.toThrow(
      "Student record not found.",
    );
  });
});

// ─── transitionToAlumni ─────────────────────────────────────────────

describe("transitionToAlumni", () => {
  it("throws NOT_FOUND when user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(alumniService.transitionToAlumni(userId)).rejects.toThrow(
      "User not found.",
    );
  });

  it("throws BAD_REQUEST when the user is not a student", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: "ALUMNI",
    } as never);

    await expect(alumniService.transitionToAlumni(userId)).rejects.toThrow(
      "Only students can transition to alumni.",
    );
  });

  it("throws NOT_FOUND when student record is missing", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: "STUDENT",
    } as never);
    mockPrisma.student.findUnique.mockResolvedValue(null);

    await expect(alumniService.transitionToAlumni(userId)).rejects.toThrow(
      "Student record not found.",
    );
  });

  it("throws BAD_REQUEST when graduation has not been recorded", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: "STUDENT",
    } as never);
    mockPrisma.student.findUnique.mockResolvedValue({
      id: "student-1",
      academicStatus: "ENROLLED",
      graduationYear: null,
    } as never);

    await expect(alumniService.transitionToAlumni(userId)).rejects.toThrow(
      "Graduation has not been recorded yet. Please contact the university office.",
    );
  });

  it("flips the role, backfills batch year, and awards the Alumnus badge", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: "STUDENT",
    } as never);
    mockPrisma.student.findUnique.mockResolvedValue({
      id: "student-1",
      academicStatus: "GRADUATED",
      graduationYear: 2026,
    } as never);

    await alumniService.transitionToAlumni(userId);

    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { role: "ALUMNI" },
    });
    expect(mockTx.student.update).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { transitionConfirmedAt: expect.any(Date) },
    });
    expect(mockTx.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId },
      select: { batchYear: true },
    });
    expect(mockTx.userProfile.update).toHaveBeenCalledWith({
      where: { userId },
      data: { batchYear: 2026 },
    });
    expect(mockTx.badge.findUnique).toHaveBeenCalledWith({
      where: { name: "Alumnus" },
    });
    expect(mockTx.userBadge.create).toHaveBeenCalledWith({
      data: { userId, badgeId: "badge-alumnus" },
    });
  });

  it("does not duplicate the Alumnus badge when already owned", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: "STUDENT",
    } as never);
    mockPrisma.student.findUnique.mockResolvedValue({
      id: "student-1",
      academicStatus: "GRADUATED",
      graduationYear: 2026,
    } as never);
    mockBadgeAlreadyOwned = true;

    await alumniService.transitionToAlumni(userId);

    expect(mockTx.userBadge.create).not.toHaveBeenCalled();
  });

  it("skips the badge award and batch backfill when the badge is not seeded and there is no graduation year", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: "STUDENT",
    } as never);
    mockPrisma.student.findUnique.mockResolvedValue({
      id: "student-1",
      academicStatus: "GRADUATED",
      graduationYear: null,
    } as never);
    mockBadgeFound = false;

    await alumniService.transitionToAlumni(userId);

    expect(mockTx.badge.findUnique).toHaveBeenCalled();
    expect(mockTx.userBadge.create).not.toHaveBeenCalled();
    expect(mockTx.userProfile.findUnique).not.toHaveBeenCalled();
  });

  it("notifies the new alumni after a successful transition", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: userId,
      role: "STUDENT",
    } as never);
    mockPrisma.student.findUnique.mockResolvedValue({
      id: "student-1",
      academicStatus: "GRADUATED",
      graduationYear: 2026,
    } as never);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    await alumniService.transitionToAlumni(userId);

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          type: "ALUMNI_TRANSITION_COMPLETE",
        }),
      }),
    );
  });
});

// ─── listDirectory ──────────────────────────────────────────────────

describe("listDirectory", () => {
  const directoryMember = {
    id: userId,
    name: "Alice",
    image: null,
    student: {
      studentId,
      department: "CSE",
      graduationYear: 2026,
      graduationSemester: "FALL",
      degreeTitle: "BSc in CSE",
    },
    profile: {
      location: "Dhaka",
      currentEmployer: "Tech Co",
      jobTitle: "Engineer",
      industry: "IT",
      isMentor: true,
      mentorshipTopics: ["Career", "Interview"],
      batchYear: 2026,
    },
  };

  it("returns paginated alumni that opted in to the directory", async () => {
    mockPrisma.$transaction.mockResolvedValue([directoryMember, 1] as never);

    const result = await alumniService.listDirectory({});

    expect(result.data).toEqual(directoryMember);
    expect(result.meta).toEqual({
      page: 1,
      limit: 12,
      total: 1,
      totalPages: 1,
    });
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "ALUMNI",
          status: "ACTIVE",
          isDeleted: false,
          profile: { is: { showInAlumniDirectory: true } },
        }),
      }),
    );
  });

  it("applies department and graduation year filters via student", async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0] as never);

    await alumniService.listDirectory({ department: "CSE", graduationYear: 2026 });

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          student: {
            is: { department: "CSE", graduationYear: 2026 },
          },
        }),
      }),
    );
  });

  it("applies text search across name, job title, and employer", async () => {
    mockPrisma.$transaction.mockResolvedValue([[], 0] as never);

    await alumniService.listDirectory({ q: "engineer" });

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: "engineer", mode: "insensitive" } },
            {
              profile: {
                is: { jobTitle: { contains: "engineer", mode: "insensitive" } },
              },
            },
            {
              profile: {
                is: {
                  currentEmployer: { contains: "engineer", mode: "insensitive" },
                },
              },
            },
          ],
        }),
      }),
    );
  });
});

// ─── getDirectoryMember ─────────────────────────────────────────────

describe("getDirectoryMember", () => {
  const visibleMember = {
    id: targetUserId,
    name: "Bob",
    image: null,
    createdAt: new Date(),
    student: {
      studentId,
      department: "CSE",
      admissionYear: 2022,
      admissionSemester: "FALL",
      graduationYear: 2026,
      graduationSemester: "FALL",
      graduationDate: new Date("2026-12-31"),
      degreeTitle: "BSc in CSE",
    },
    profile: {
      bio: "Hi",
      coverImage: null,
      location: "Dhaka",
      currentEmployer: "Acme",
      jobTitle: "Manager",
      industry: "Finance",
      showInAlumniDirectory: true,
      isMentor: false,
      mentorshipTopics: [],
      batchYear: 2026,
    },
    alumniEmployment: [],
  };

  it("throws NOT_FOUND when the target is not an active alumni member", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      alumniService.getDirectoryMember({ id: userId, role: "STUDENT" }, targetUserId),
    ).rejects.toThrow("Alumni member not found.");
  });

  it("returns the member with connection stats", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(visibleMember as never);
    mockPrisma.connection.count.mockResolvedValue(5);

    const result = await alumniService.getDirectoryMember(
      { id: userId, role: "STUDENT" },
      targetUserId,
    );

    expect(result.id).toBe(targetUserId);
    expect(result.stats.connectionCount).toBe(5);
    expect(mockPrisma.connection.findFirst).not.toHaveBeenCalled();
  });

  it("hides opted-out members from strangers", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...visibleMember,
      profile: { ...visibleMember.profile, showInAlumniDirectory: false },
    } as never);
    mockPrisma.connection.findFirst.mockResolvedValue(null);

    await expect(
      alumniService.getDirectoryMember({ id: userId, role: "STUDENT" }, targetUserId),
    ).rejects.toThrow("Alumni member not found.");
  });

  it("allows an accepted connection to view an opted-out member", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...visibleMember,
      profile: { ...visibleMember.profile, showInAlumniDirectory: false },
    } as never);
    mockPrisma.connection.findFirst.mockResolvedValue({ id: "conn-1" } as never);
    mockPrisma.connection.count.mockResolvedValue(1);

    const result = await alumniService.getDirectoryMember(
      { id: userId, role: "STUDENT" },
      targetUserId,
    );

    expect(result.id).toBe(targetUserId);
  });

  it("allows admins to view an opted-out member", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...visibleMember,
      profile: { ...visibleMember.profile, showInAlumniDirectory: false },
    } as never);
    mockPrisma.connection.count.mockResolvedValue(1);

    const result = await alumniService.getDirectoryMember(
      { id: adminId, role: "ADMIN" },
      targetUserId,
    );

    expect(result.id).toBe(targetUserId);
  });

  it("allows the member to view their own opted-out profile", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...visibleMember,
      profile: { ...visibleMember.profile, showInAlumniDirectory: false },
    } as never);
    mockPrisma.connection.count.mockResolvedValue(0);

    const result = await alumniService.getDirectoryMember(
      { id: targetUserId, role: "ALUMNI" },
      targetUserId,
    );

    expect(result.id).toBe(targetUserId);
    expect(mockPrisma.connection.findFirst).not.toHaveBeenCalled();
  });
});
