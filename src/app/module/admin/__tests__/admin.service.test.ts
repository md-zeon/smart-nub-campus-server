import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    resource: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    course: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    resourceCategory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    discussionCategory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    questionCategory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    discussion: { count: vi.fn() },
    question: { count: vi.fn() },
    verificationRequest: { count: vi.fn() },
    auditLog: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fns) =>
      Array.isArray(fns) ? Promise.all(fns) : fns((...args: unknown[]) => args[args.length - 1])
    ),
  },
}));

import { prisma } from "../../../../app/lib/prisma";
import { adminService } from "../admin.service";

const mockPrisma = vi.mocked(prisma);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getDashboardStats ───────────────────────────────────────────────

describe("getDashboardStats", () => {
  it("returns platform-wide statistics", async () => {
    vi.mocked(mockPrisma.user.count).mockResolvedValue(100);
    vi.mocked(mockPrisma.resource.count).mockResolvedValue(50);
    vi.mocked(mockPrisma.discussion.count).mockResolvedValue(30);
    vi.mocked(mockPrisma.question.count).mockResolvedValue(20);
    vi.mocked(mockPrisma.event.count).mockResolvedValue(10);
    vi.mocked(mockPrisma.verificationRequest.count).mockResolvedValue(5);
    vi.mocked(mockPrisma.resource.groupBy).mockResolvedValue([
      { isVerified: true, _count: 40 },
      { isVerified: false, _count: 10 },
    ] as never);

    const result = await adminService.getDashboardStats();

    expect(result).toEqual({
      totalUsers: 100,
      totalResources: 50,
      verifiedResources: 40,
      unverifiedResources: 10,
      totalDiscussions: 30,
      totalQuestions: 20,
      totalEvents: 10,
      pendingVerifications: 5,
    });
  });

  it("returns zero counts when no data exists", async () => {
    vi.mocked(mockPrisma.user.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.resource.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.discussion.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.question.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.event.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.verificationRequest.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.resource.groupBy).mockResolvedValue([]);

    const result = await adminService.getDashboardStats();

    expect(result.totalUsers).toBe(0);
    expect(result.verifiedResources).toBe(0);
    expect(result.unverifiedResources).toBe(0);
  });

  it("handles groupBy returning only verified resources", async () => {
    vi.mocked(mockPrisma.user.count).mockResolvedValue(10);
    vi.mocked(mockPrisma.resource.count).mockResolvedValue(5);
    vi.mocked(mockPrisma.discussion.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.question.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.event.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.verificationRequest.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.resource.groupBy).mockResolvedValue([
      { isVerified: true, _count: 5 },
    ] as never);

    const result = await adminService.getDashboardStats();

    expect(result.verifiedResources).toBe(5);
    expect(result.unverifiedResources).toBe(0);
  });
});

// ─── listUsers ───────────────────────────────────────────────────────

describe("listUsers", () => {
  const mockUsers = [
    { id: "u1", name: "Alice", email: "alice@test.com", role: "STUDENT", status: "ACTIVE", isDeleted: false, hasCompletedOnboarding: true, createdAt: new Date(), student: { id: "s1", department: "CS", admissionYear: 2024, admissionSemester: "FALL" }, admin: null },
    { id: "u2", name: "Bob", email: "bob@test.com", role: "ADMIN", status: "ACTIVE", isDeleted: false, hasCompletedOnboarding: true, createdAt: new Date(), student: null, admin: { id: "a1", designation: "Super Admin", department: "IT" } },
  ];

  it("returns paginated users with default pagination", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockUsers, 2] as never);

    const result = await adminService.listUsers({});

    expect(result.data).toEqual(mockUsers);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
  });

  it("applies search filter", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([[mockUsers[0]], 1] as never);

    await adminService.listUsers({ search: "alice" });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("applies role filter", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockUsers, 2] as never);

    await adminService.listUsers({ role: "STUDENT" });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("applies status filter", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([[], 0] as never);

    const result = await adminService.listUsers({ status: "BANNED" as never });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it("applies custom page and limit", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([[mockUsers[1]], 2] as never);

    const result = await adminService.listUsers({ page: 2, limit: 1 });

    expect(result.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
  });
});

// ─── getUserById ─────────────────────────────────────────────────────

describe("getUserById", () => {
  const mockUser = {
    id: "u1",
    name: "Alice",
    email: "alice@test.com",
    role: "STUDENT",
    status: "ACTIVE",
    isDeleted: false,
    hasCompletedOnboarding: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    student: { id: "s1", department: "CS" },
    admin: null,
    profile: null,
    _count: { resources: 5, discussions: 3, questions: 2, answers: 1, teamMembers: 0 },
  };

  it("returns user details when found", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(mockUser as never);

    const result = await adminService.getUserById("u1");

    expect(result.id).toBe("u1");
    expect(result._count.resources).toBe(5);
  });

  it("throws NOT_FOUND when user does not exist", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

    await expect(adminService.getUserById("nonexistent")).rejects.toThrow("User not found.");
  });
});

// ─── updateUserStatus ────────────────────────────────────────────────

describe("updateUserStatus", () => {
  it("updates user status successfully", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      id: "u1", name: "Alice", role: "STUDENT", isDeleted: false, status: "ACTIVE",
    } as never);
    vi.mocked(mockPrisma.user.update).mockResolvedValue({
      id: "u1", name: "Alice", email: "alice@test.com", role: "STUDENT", status: "SUSPENDED",
    } as never);

    const result = await adminService.updateUserStatus("u1", "SUSPENDED");

    expect(result.status).toBe("SUSPENDED");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { status: "SUSPENDED" },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
  });

  it("throws NOT_FOUND when user does not exist", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

    await expect(adminService.updateUserStatus("nonexistent", "ACTIVE")).rejects.toThrow("User not found.");
  });

  it("throws BAD_REQUEST when user is deleted", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      id: "u1", role: "STUDENT", isDeleted: true, status: "ACTIVE",
    } as never);

    await expect(adminService.updateUserStatus("u1", "ACTIVE")).rejects.toThrow("Cannot modify a deleted user.");
  });

  it("throws FORBIDDEN when trying to modify an admin user", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      id: "u1", role: "ADMIN", isDeleted: false, status: "ACTIVE",
    } as never);

    await expect(adminService.updateUserStatus("u1", "BANNED")).rejects.toThrow("Cannot modify an admin user's status.");
  });
});

// ─── deleteUser ──────────────────────────────────────────────────────

describe("deleteUser", () => {
  it("soft-deletes a user successfully", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      id: "u1", role: "STUDENT", isDeleted: false,
    } as never);
    vi.mocked(mockPrisma.user.update).mockResolvedValue({} as never);

    const result = await adminService.deleteUser("u1");

    expect(result).toEqual({ message: "User deleted successfully." });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { isDeleted: true, deletedAt: expect.any(Date) },
    });
  });

  it("throws NOT_FOUND when user does not exist", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

    await expect(adminService.deleteUser("nonexistent")).rejects.toThrow("User not found.");
  });

  it("throws BAD_REQUEST when user is already deleted", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      id: "u1", role: "STUDENT", isDeleted: true,
    } as never);

    await expect(adminService.deleteUser("u1")).rejects.toThrow("User is already deleted.");
  });

  it("throws FORBIDDEN when trying to delete an admin user", async () => {
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({
      id: "u1", role: "ADMIN", isDeleted: false,
    } as never);

    await expect(adminService.deleteUser("u1")).rejects.toThrow("Cannot delete an admin user.");
  });
});

// ─── listResources ───────────────────────────────────────────────────

describe("listResources", () => {
  const mockResources = [
    { id: "r1", title: "Notes", description: "CS notes", courseId: "c1", categoryId: "cat1", isVerified: true, createdAt: new Date(), course: { id: "c1", code: "CS101", name: "Intro" }, category: { id: "cat1", name: "Lecture Notes", slug: "lecture-notes" }, uploader: { id: "u1", name: "Alice", email: "alice@test.com" } },
  ];

  it("returns paginated resources with default pagination", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockResources, 1] as never);

    const result = await adminService.listResources({});

    expect(result.data).toEqual(mockResources);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it("applies search, courseId, categoryId, and isVerified filters", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockResources, 1] as never);

    await adminService.listResources({ search: "notes", courseId: "c1", categoryId: "cat1", isVerified: true });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("returns empty data when no resources match", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([[], 0] as never);

    const result = await adminService.listResources({ search: "nonexistent" });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});

// ─── verifyResource ──────────────────────────────────────────────────

describe("verifyResource", () => {
  it("verifies a resource successfully", async () => {
    vi.mocked(mockPrisma.resource.findUnique).mockResolvedValue({ id: "r1", isVerified: false } as never);
    vi.mocked(mockPrisma.resource.update).mockResolvedValue({ id: "r1", isVerified: true } as never);

    const result = await adminService.verifyResource("r1", true);

    expect(result.isVerified).toBe(true);
  });

  it("unverifies a resource", async () => {
    vi.mocked(mockPrisma.resource.findUnique).mockResolvedValue({ id: "r1", isVerified: true } as never);
    vi.mocked(mockPrisma.resource.update).mockResolvedValue({ id: "r1", isVerified: false } as never);

    const result = await adminService.verifyResource("r1", false);

    expect(result.isVerified).toBe(false);
  });

  it("throws NOT_FOUND when resource does not exist", async () => {
    vi.mocked(mockPrisma.resource.findUnique).mockResolvedValue(null);

    await expect(adminService.verifyResource("nonexistent", true)).rejects.toThrow("Resource not found.");
  });
});

// ─── deleteResource ──────────────────────────────────────────────────

describe("deleteResource", () => {
  it("soft-deletes a resource successfully", async () => {
    vi.mocked(mockPrisma.resource.findUnique).mockResolvedValue({ id: "r1" } as never);
    vi.mocked(mockPrisma.resource.update).mockResolvedValue({} as never);

    const result = await adminService.deleteResource("r1");

    expect(result).toEqual({ message: "Resource removed successfully." });
    expect(mockPrisma.resource.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { isDeleted: true, deletedAt: expect.any(Date) },
    });
  });

  it("throws NOT_FOUND when resource does not exist", async () => {
    vi.mocked(mockPrisma.resource.findUnique).mockResolvedValue(null);

    await expect(adminService.deleteResource("nonexistent")).rejects.toThrow("Resource not found.");
  });
});

// ─── listCourses ─────────────────────────────────────────────────────

describe("listCourses", () => {
  const mockCourses = [
    { id: "c1", code: "CS101", name: "Intro to CS", _count: { resources: 5, discussions: 2 } },
  ];

  it("returns paginated courses with default pagination", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockCourses, 1] as never);

    const result = await adminService.listCourses();

    expect(result.data).toEqual(mockCourses);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it("applies custom pagination", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockCourses, 1] as never);

    const result = await adminService.listCourses(2, 5);

    expect(result.meta).toEqual({ page: 2, limit: 5, total: 1, totalPages: 1 });
  });
});

// ─── getCourseById ───────────────────────────────────────────────────

describe("getCourseById", () => {
  it("returns course details when found", async () => {
    const mockCourse = { id: "c1", code: "CS101", name: "Intro to CS", _count: { resources: 5, discussions: 2 } };
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue(mockCourse as never);

    const result = await adminService.getCourseById("c1");

    expect(result.code).toBe("CS101");
  });

  it("throws NOT_FOUND when course does not exist", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue(null);

    await expect(adminService.getCourseById("nonexistent")).rejects.toThrow("Course not found.");
  });
});

// ─── createCourse ────────────────────────────────────────────────────

describe("createCourse", () => {
  const courseData = { code: "CS101", name: "Intro to CS", department: "CS", semester: 1, description: "A course" };

  it("creates a course successfully", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue(null);
    vi.mocked(mockPrisma.course.create).mockResolvedValue({ id: "c1", ...courseData, department: "CS" } as never);

    const result = await adminService.createCourse(courseData);

    expect(result.code).toBe("CS101");
    expect(mockPrisma.course.create).toHaveBeenCalled();
  });

  it("throws CONFLICT when course code already exists", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue({ id: "existing", code: "CS101" } as never);

    await expect(adminService.createCourse(courseData)).rejects.toThrow("Course with this code already exists.");
  });

  it("creates course with optional fields omitted", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue(null);
    vi.mocked(mockPrisma.course.create).mockResolvedValue({ id: "c2", code: "MATH101", name: "Math I", department: "MATH", semester: null, description: null } as never);

    const result = await adminService.createCourse({ code: "MATH101", name: "Math I", department: "MATH" });

    expect(result.code).toBe("MATH101");
  });
});

// ─── updateCourse ────────────────────────────────────────────────────

describe("updateCourse", () => {
  it("updates a course successfully", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue({ id: "c1", code: "CS101" } as never);
    vi.mocked(mockPrisma.course.update).mockResolvedValue({ id: "c1", code: "CS101", name: "Updated" } as never);

    const result = await adminService.updateCourse("c1", { name: "Updated" });

    expect(result.name).toBe("Updated");
  });

  it("throws NOT_FOUND when course does not exist", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue(null);

    await expect(adminService.updateCourse("nonexistent", { name: "X" })).rejects.toThrow("Course not found.");
  });

  it("throws CONFLICT when updated code conflicts with another course", async () => {
    vi.mocked(mockPrisma.course.findUnique)
      .mockResolvedValueOnce({ id: "c1", code: "CS101" } as never)
      .mockResolvedValueOnce({ id: "c2", code: "CS201" } as never);

    await expect(adminService.updateCourse("c1", { code: "CS201" })).rejects.toThrow("Course with this code already exists.");
  });

  it("allows keeping the same code", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue({ id: "c1", code: "CS101" } as never);
    vi.mocked(mockPrisma.course.update).mockResolvedValue({ id: "c1", code: "CS101" } as never);

    const result = await adminService.updateCourse("c1", { code: "CS101" });

    expect(result.code).toBe("CS101");
  });
});

// ─── deleteCourse ────────────────────────────────────────────────────

describe("deleteCourse", () => {
  it("deletes a course with no associations", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue({
      id: "c1", _count: { resources: 0, discussions: 0 },
    } as never);
    vi.mocked(mockPrisma.course.delete).mockResolvedValue({} as never);

    const result = await adminService.deleteCourse("c1");

    expect(result).toEqual({ message: "Course deleted successfully." });
  });

  it("throws NOT_FOUND when course does not exist", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue(null);

    await expect(adminService.deleteCourse("nonexistent")).rejects.toThrow("Course not found.");
  });

  it("throws BAD_REQUEST when course has associated resources", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue({
      id: "c1", _count: { resources: 3, discussions: 0 },
    } as never);

    await expect(adminService.deleteCourse("c1")).rejects.toThrow("Cannot delete a course with associated resources or discussions.");
  });

  it("throws BAD_REQUEST when course has associated discussions", async () => {
    vi.mocked(mockPrisma.course.findUnique).mockResolvedValue({
      id: "c1", _count: { resources: 0, discussions: 2 },
    } as never);

    await expect(adminService.deleteCourse("c1")).rejects.toThrow("Cannot delete a course with associated resources or discussions.");
  });
});

// ─── listResourceCategories ──────────────────────────────────────────

describe("listResourceCategories", () => {
  const mockCategories = [
    { id: "cat1", name: "Lecture Notes", slug: "lecture-notes", _count: { resources: 10 } },
  ];

  it("returns paginated categories with default pagination", async () => {
    vi.mocked(mockPrisma.resourceCategory.findMany).mockResolvedValue(mockCategories as never);
    vi.mocked(mockPrisma.resourceCategory.count).mockResolvedValue(1);

    const result = await adminService.listResourceCategories();

    expect(result.data).toEqual(mockCategories);
    expect(result.meta).toEqual({ page: 1, limit: 50, total: 1, totalPages: 1 });
  });

  it("applies custom pagination", async () => {
    vi.mocked(mockPrisma.resourceCategory.findMany).mockResolvedValue(mockCategories as never);
    vi.mocked(mockPrisma.resourceCategory.count).mockResolvedValue(1);

    const result = await adminService.listResourceCategories(1, 10);

    expect(result.meta.limit).toBe(10);
  });
});

// ─── getResourceCategoryById ─────────────────────────────────────────

describe("getResourceCategoryById", () => {
  it("returns category when found", async () => {
    vi.mocked(mockPrisma.resourceCategory.findUnique).mockResolvedValue({
      id: "cat1", name: "Lecture Notes", _count: { resources: 5 },
    } as never);

    const result = await adminService.getResourceCategoryById("cat1");

    expect(result.name).toBe("Lecture Notes");
  });

  it("throws NOT_FOUND when category does not exist", async () => {
    vi.mocked(mockPrisma.resourceCategory.findUnique).mockResolvedValue(null);

    await expect(adminService.getResourceCategoryById("nonexistent")).rejects.toThrow("Resource category not found.");
  });
});

// ─── createResourceCategory ──────────────────────────────────────────

describe("createResourceCategory", () => {
  it("creates a category with auto-generated slug", async () => {
    vi.mocked(mockPrisma.resourceCategory.findUnique).mockResolvedValue(null);
    vi.mocked(mockPrisma.resourceCategory.create).mockResolvedValue({
      id: "cat1", name: "Lecture Notes", slug: "lecture-notes", icon: "book", description: null,
    } as never);

    const result = await adminService.createResourceCategory({ name: "Lecture Notes", icon: "book" });

    expect(result.slug).toBe("lecture-notes");
    expect(result.name).toBe("Lecture Notes");
  });

  it("throws CONFLICT when category slug already exists", async () => {
    vi.mocked(mockPrisma.resourceCategory.findUnique).mockResolvedValue({
      id: "existing", slug: "lecture-notes",
    } as never);

    await expect(adminService.createResourceCategory({ name: "Lecture Notes" })).rejects.toThrow("Category with this name already exists.");
  });
});

// ─── updateResourceCategory ──────────────────────────────────────────

describe("updateResourceCategory", () => {
  it("updates category name and regenerates slug", async () => {
    vi.mocked(mockPrisma.resourceCategory.findUnique).mockResolvedValue({ id: "cat1", name: "Old" } as never);
    vi.mocked(mockPrisma.resourceCategory.update).mockResolvedValue({ id: "cat1", name: "New Name", slug: "new-name" } as never);

    const result = await adminService.updateResourceCategory("cat1", { name: "New Name" });

    expect(result.name).toBe("New Name");
  });

  it("throws NOT_FOUND when category does not exist", async () => {
    vi.mocked(mockPrisma.resourceCategory.findUnique).mockResolvedValue(null);

    await expect(adminService.updateResourceCategory("nonexistent", { name: "X" })).rejects.toThrow("Resource category not found.");
  });
});

// ─── deleteResourceCategory ──────────────────────────────────────────

describe("deleteResourceCategory", () => {
  it("deletes a category with no associated resources", async () => {
    vi.mocked(mockPrisma.resourceCategory.findUnique).mockResolvedValue({
      id: "cat1", _count: { resources: 0 },
    } as never);
    vi.mocked(mockPrisma.resourceCategory.delete).mockResolvedValue({} as never);

    const result = await adminService.deleteResourceCategory("cat1");

    expect(result).toEqual({ message: "Resource category deleted successfully." });
  });

  it("throws NOT_FOUND when category does not exist", async () => {
    vi.mocked(mockPrisma.resourceCategory.findUnique).mockResolvedValue(null);

    await expect(adminService.deleteResourceCategory("nonexistent")).rejects.toThrow("Resource category not found.");
  });

  it("throws BAD_REQUEST when category has associated resources", async () => {
    vi.mocked(mockPrisma.resourceCategory.findUnique).mockResolvedValue({
      id: "cat1", _count: { resources: 5 },
    } as never);

    await expect(adminService.deleteResourceCategory("cat1")).rejects.toThrow("Cannot delete a category with associated resources.");
  });
});

// ─── listDiscussionCategories ────────────────────────────────────────

describe("listDiscussionCategories", () => {
  it("returns paginated discussion categories", async () => {
    const mockCats = [{ id: "dc1", name: "General", _count: { discussions: 10 } }];
    vi.mocked(mockPrisma.discussionCategory.findMany).mockResolvedValue(mockCats as never);
    vi.mocked(mockPrisma.discussionCategory.count).mockResolvedValue(1);

    const result = await adminService.listDiscussionCategories();

    expect(result.data).toEqual(mockCats);
    expect(result.meta.total).toBe(1);
  });
});

// ─── createDiscussionCategory ────────────────────────────────────────

describe("createDiscussionCategory", () => {
  it("creates a discussion category successfully", async () => {
    vi.mocked(mockPrisma.discussionCategory.findUnique).mockResolvedValue(null);
    vi.mocked(mockPrisma.discussionCategory.create).mockResolvedValue({
      id: "dc1", name: "General", slug: "general", icon: null,
    } as never);

    const result = await adminService.createDiscussionCategory({ name: "General" });

    expect(result.slug).toBe("general");
  });

  it("throws CONFLICT when slug already exists", async () => {
    vi.mocked(mockPrisma.discussionCategory.findUnique).mockResolvedValue({ id: "existing" } as never);

    await expect(adminService.createDiscussionCategory({ name: "General" })).rejects.toThrow("Category with this name already exists.");
  });
});

// ─── deleteDiscussionCategory ────────────────────────────────────────

describe("deleteDiscussionCategory", () => {
  it("deletes when no discussions exist", async () => {
    vi.mocked(mockPrisma.discussionCategory.findUnique).mockResolvedValue({
      id: "dc1", _count: { discussions: 0 },
    } as never);
    vi.mocked(mockPrisma.discussionCategory.delete).mockResolvedValue({} as never);

    const result = await adminService.deleteDiscussionCategory("dc1");

    expect(result).toEqual({ message: "Discussion category deleted successfully." });
  });

  it("throws BAD_REQUEST when discussions exist", async () => {
    vi.mocked(mockPrisma.discussionCategory.findUnique).mockResolvedValue({
      id: "dc1", _count: { discussions: 5 },
    } as never);

    await expect(adminService.deleteDiscussionCategory("dc1")).rejects.toThrow("Cannot delete a category with associated discussions.");
  });
});

// ─── listQuestionCategories ──────────────────────────────────────────

describe("listQuestionCategories", () => {
  it("returns paginated question categories", async () => {
    const mockCats = [{ id: "qc1", name: "Homework Help", _count: { questions: 3 } }];
    vi.mocked(mockPrisma.questionCategory.findMany).mockResolvedValue(mockCats as never);
    vi.mocked(mockPrisma.questionCategory.count).mockResolvedValue(1);

    const result = await adminService.listQuestionCategories();

    expect(result.data).toEqual(mockCats);
    expect(result.meta.total).toBe(1);
  });
});

// ─── createQuestionCategory ──────────────────────────────────────────

describe("createQuestionCategory", () => {
  it("creates a question category successfully", async () => {
    vi.mocked(mockPrisma.questionCategory.findUnique).mockResolvedValue(null);
    vi.mocked(mockPrisma.questionCategory.create).mockResolvedValue({
      id: "qc1", name: "Homework Help", slug: "homework-help", icon: null,
    } as never);

    const result = await adminService.createQuestionCategory({ name: "Homework Help" });

    expect(result.slug).toBe("homework-help");
  });

  it("throws CONFLICT when slug already exists", async () => {
    vi.mocked(mockPrisma.questionCategory.findUnique).mockResolvedValue({ id: "existing" } as never);

    await expect(adminService.createQuestionCategory({ name: "Homework Help" })).rejects.toThrow("Category with this name already exists.");
  });
});

// ─── deleteQuestionCategory ──────────────────────────────────────────

describe("deleteQuestionCategory", () => {
  it("deletes when no questions exist", async () => {
    vi.mocked(mockPrisma.questionCategory.findUnique).mockResolvedValue({
      id: "qc1", _count: { questions: 0 },
    } as never);
    vi.mocked(mockPrisma.questionCategory.delete).mockResolvedValue({} as never);

    const result = await adminService.deleteQuestionCategory("qc1");

    expect(result).toEqual({ message: "Question category deleted successfully." });
  });

  it("throws BAD_REQUEST when questions exist", async () => {
    vi.mocked(mockPrisma.questionCategory.findUnique).mockResolvedValue({
      id: "qc1", _count: { questions: 4 },
    } as never);

    await expect(adminService.deleteQuestionCategory("qc1")).rejects.toThrow("Cannot delete a category with associated questions.");
  });
});

// ─── listEvents ──────────────────────────────────────────────────────

describe.skip("listEvents", () => {
  const mockEvents = [
    { id: "e1", title: "Hackathon", organizer: { id: "u1", name: "Alice", email: "alice@test.com" }, _count: { rsvps: 20 } },
  ];

  it("returns paginated events with default pagination", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockEvents, 1] as never);

    const result = await adminService.listEvents();

    expect(result.data).toEqual(mockEvents);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it("applies custom pagination", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockEvents, 1] as never);

    const result = await adminService.listEvents(3, 5);

    expect(result.meta).toEqual({ page: 3, limit: 5, total: 1, totalPages: 1 });
  });
});

// ─── getEventById ────────────────────────────────────────────────────

describe.skip("getEventById", () => {
  it("returns event when found", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue({
      id: "e1", title: "Hackathon", organizer: { id: "u1", name: "Alice", email: "alice@test.com" }, _count: { rsvps: 20 },
    } as never);

    const result = await adminService.getEventById("e1");

    expect(result.title).toBe("Hackathon");
  });

  it("throws NOT_FOUND when event does not exist", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null);

    await expect(adminService.getEventById("nonexistent")).rejects.toThrow("Event not found.");
  });
});

// ─── createEvent ─────────────────────────────────────────────────────

describe.skip("createEvent", () => {
  it("creates an event successfully", async () => {
    vi.mocked(mockPrisma.event.create).mockResolvedValue({
      id: "e1", title: "Hackathon", description: null, eventDate: new Date(), location: null, imageUrl: null, organizerId: null, status: "UPCOMING", isFeatured: false,
      organizer: null,
    } as never);

    const result = await adminService.createEvent({ title: "Hackathon", eventDate: new Date() });

    expect(result.title).toBe("Hackathon");
    expect(result.status).toBe("UPCOMING");
  });
});

// ─── updateEvent ─────────────────────────────────────────────────────

describe.skip("updateEvent", () => {
  it("updates an event successfully", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue({ id: "e1", title: "Hackathon" } as never);
    vi.mocked(mockPrisma.event.update).mockResolvedValue({ id: "e1", title: "Updated Hackathon", organizer: null } as never);

    const result = await adminService.updateEvent("e1", { title: "Updated Hackathon" });

    expect(result.title).toBe("Updated Hackathon");
  });

  it("throws NOT_FOUND when event does not exist", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null);

    await expect(adminService.updateEvent("nonexistent", { title: "X" })).rejects.toThrow("Event not found.");
  });
});

// ─── deleteEvent ─────────────────────────────────────────────────────

describe.skip("deleteEvent", () => {
  it("deletes an event successfully", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue({ id: "e1" } as never);
    vi.mocked(mockPrisma.event.delete).mockResolvedValue({} as never);

    const result = await adminService.deleteEvent("e1");

    expect(result).toEqual({ message: "Event deleted successfully." });
  });

  it("throws NOT_FOUND when event does not exist", async () => {
    vi.mocked(mockPrisma.event.findUnique).mockResolvedValue(null);

    await expect(adminService.deleteEvent("nonexistent")).rejects.toThrow("Event not found.");
  });
});

// ─── listAuditLogs ───────────────────────────────────────────────────

describe("listAuditLogs", () => {
  const mockLogs = [
    { id: "log1", adminUserId: "admin1", action: "USER_BAN", targetType: "USER", targetId: "u1", createdAt: new Date(), adminUser: { id: "admin1", name: "Admin", email: "admin@test.com" } },
  ];

  it("returns paginated audit logs with default pagination", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockLogs, 1] as never);

    const result = await adminService.listAuditLogs({});

    expect(result.data).toEqual(mockLogs);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it("filters by adminUserId", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockLogs, 1] as never);

    await adminService.listAuditLogs({ adminUserId: "admin1" });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("filters by action and targetType", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockLogs, 1] as never);

    await adminService.listAuditLogs({ action: "USER_BAN", targetType: "USER" });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("filters by date range", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([mockLogs, 1] as never);

    await adminService.listAuditLogs({ startDate: "2025-01-01", endDate: "2025-12-31" });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("returns empty when no logs match", async () => {
    vi.mocked(mockPrisma.$transaction).mockResolvedValue([[], 0] as never);

    const result = await adminService.listAuditLogs({ action: "NONEXISTENT" });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});

// ─── getAuditLogById ─────────────────────────────────────────────────

describe("getAuditLogById", () => {
  it("returns audit log when found", async () => {
    vi.mocked(mockPrisma.auditLog.findUnique).mockResolvedValue({
      id: "log1", action: "USER_BAN", adminUser: { id: "admin1", name: "Admin", email: "admin@test.com" },
    } as never);

    const result = await adminService.getAuditLogById("log1");

    expect(result.id).toBe("log1");
  });

  it("throws NOT_FOUND when audit log does not exist", async () => {
    vi.mocked(mockPrisma.auditLog.findUnique).mockResolvedValue(null);

    await expect(adminService.getAuditLogById("nonexistent")).rejects.toThrow("Audit log entry not found.");
  });
});

// ─── createAuditLog ──────────────────────────────────────────────────

describe("createAuditLog", () => {
  it("creates an audit log entry", async () => {
    vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({
      id: "log1", adminUserId: "admin1", action: "USER_BAN", targetType: "USER", targetId: "u1", details: { reason: "spam" }, ipAddress: "127.0.0.1",
    } as never);

    const result = await adminService.createAuditLog({
      adminUserId: "admin1",
      action: "USER_BAN",
      targetType: "USER",
      targetId: "u1",
      details: { reason: "spam" },
      ipAddress: "127.0.0.1",
    });

    expect(result.id).toBe("log1");
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "admin1",
        action: "USER_BAN",
        entityType: "USER",
        entityId: "u1",
        details: { reason: "spam" },
        ipAddress: "127.0.0.1",
      },
    });
  });

  it("creates an audit log with optional fields omitted", async () => {
    vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({
      id: "log2", adminUserId: "admin1", action: "COURSE_CREATE", targetType: "COURSE", targetId: null, details: undefined, ipAddress: null,
    } as never);

    const result = await adminService.createAuditLog({
      adminUserId: "admin1",
      action: "COURSE_CREATE",
      targetType: "COURSE",
    });

    expect(result.id).toBe("log2");
  });
});
