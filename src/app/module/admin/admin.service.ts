import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { getSocketServer } from "../../lib/socket/socket-server";
import {
  ListUsersQuery,
  ListResourcesQuery,
  ListAuditLogsQuery,
  CreateAuditLogInput,
  DashboardChartsQuery,
  ChartBucket,
  DepartmentBucket,
} from "./admin.interface";

// --- Helper: Create audit log entry ---
const createAuditLog = async (data: CreateAuditLogInput) => {
  return prisma.auditLog.create({
    data: {
      userId: data.adminUserId,
      action: data.action,
      entityType: data.targetType,
      entityId: data.targetId ?? "",
      details: (data.details as Record<string, string>) ?? undefined,
      ipAddress: data.ipAddress ?? null,
    },
  });
};

// --- Dashboard Stats ---
const getDashboardStats = async () => {
  const [
    totalUsers,
    totalResources,
    totalDiscussions,
    totalQuestions,
    totalEvents,
    pendingVerifications,
    totalResourcesByVerification,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.resource.count({ where: { isDeleted: false } }),
    prisma.discussion.count({ where: { isDeleted: false } }),
    prisma.question.count({ where: { isDeleted: false } }),
    prisma.event.count(),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    prisma.resource.groupBy({
      by: ["isVerified"],
      where: { isDeleted: false },
      _count: true,
    }),
  ]);

  const verifiedResources =
    totalResourcesByVerification.find((r) => r.isVerified)?._count ?? 0;
  const unverifiedResources =
    totalResourcesByVerification.find((r) => !r.isVerified)?._count ?? 0;

  return {
    totalUsers,
    totalResources,
    verifiedResources,
    unverifiedResources,
    totalDiscussions,
    totalQuestions,
    totalEvents,
    pendingVerifications,
  };
};

// --- Dashboard Charts ---
const getDashboardCharts = async (query: DashboardChartsQuery) => {
  const days = query.days ?? 7;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  const [userRegistrations, resourceUploads, departmentDistribution, verificationTrends] =
    await Promise.all([
      prisma.$queryRaw<ChartBucket[]>`
        SELECT
          TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count
        FROM "user"
        WHERE "createdAt" >= ${startDate}
          AND "isDeleted" = false
        GROUP BY "createdAt"::date
        ORDER BY "createdAt"::date ASC
      `,
      prisma.$queryRaw<ChartBucket[]>`
        SELECT
          TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count
        FROM "resource"
        WHERE "createdAt" >= ${startDate}
          AND "isDeleted" = false
        GROUP BY "createdAt"::date
        ORDER BY "createdAt"::date ASC
      `,
      prisma.student.groupBy({
        by: ["department"],
        _count: true,
        orderBy: { _count: { department: "desc" } },
        take: 8,
      }),
      prisma.$queryRaw<ChartBucket[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('week', "createdAt"), 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count
        FROM "verification_request"
        WHERE "createdAt" >= ${new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE_TRUNC('week', "createdAt")
        ORDER BY DATE_TRUNC('week', "createdAt") ASC
      `,
    ]);

  const departmentBuckets: DepartmentBucket[] = departmentDistribution.map((d) => ({
    department: d.department,
    count: d._count,
  }));

  return {
    userRegistrations,
    resourceUploads,
    departmentDistribution: departmentBuckets,
    verificationTrends,
  };
};

// --- User Management ---
const listUsers = async (query: ListUsersQuery) => {
  const { search, role, status, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (status) where.status = status;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isDeleted: true,
        hasCompletedOnboarding: true,
        createdAt: true,
        student: { select: { id: true, department: true, admissionYear: true, admissionSemester: true } },
        admin: { select: { id: true, designation: true, department: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      isDeleted: true,
      isDeactivated: true,
      hasCompletedOnboarding: true,
      createdAt: true,
      updatedAt: true,
      student: {
        select: {
          id: true,
          studentId: true,
          department: true,
          admissionYear: true,
          admissionSemester: true,
        },
      },
      admin: {
        select: {
          id: true,
          designation: true,
          department: true,
          joinedAt: true,
        },
      },
      profile: {
        select: {
          id: true,
          bio: true,
          coverImage: true,
          githubUrl: true,
          linkedinUrl: true,
          portfolioUrl: true,
          websiteUrl: true,
          location: true,
          currentSemester: true,
          batchYear: true,
        },
      },
      _count: {
        select: {
          resources: true,
          discussions: true,
          questions: true,
          answers: true,
          teamMembers: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  return user;
};

const updateUserStatus = async (
  id: string,
  newStatus: "ACTIVE" | "SUSPENDED" | "BANNED",
) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  if (user.isDeleted) {
    throw new AppError(status.BAD_REQUEST, "Cannot modify a deleted user.");
  }

  if (user.role === "ADMIN") {
    throw new AppError(status.FORBIDDEN, "Cannot modify an admin user's status.");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: newStatus },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  return updated;
};

const deleteUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  if (user.isDeleted) {
    throw new AppError(status.BAD_REQUEST, "User is already deleted.");
  }

  if (user.role === "ADMIN") {
    throw new AppError(status.FORBIDDEN, "Cannot delete an admin user.");
  }

  await prisma.user.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return { message: "User deleted successfully." };
};

// --- Resource Management ---
const listResources = async (query: ListResourcesQuery) => {
  const { search, courseId, categoryId, isVerified, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (courseId) where.courseId = courseId;
  if (categoryId) where.categoryId = categoryId;
  if (isVerified !== undefined) where.isVerified = isVerified;

  const [resources, total] = await prisma.$transaction([
    prisma.resource.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
        uploader: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.resource.count({ where }),
  ]);

  return {
    data: resources,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const verifyResource = async (id: string, isVerified: boolean) => {
  const resource = await prisma.resource.findUnique({
    where: { id, isDeleted: false },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  const updated = await prisma.resource.update({
    where: { id },
    data: { isVerified },
    include: {
      course: { select: { id: true, code: true, name: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  try {
    const io = getSocketServer();
    io.emit("admin:review-update", {
      type: "resource",
      entityId: id,
      status: isVerified ? "VERIFIED" : "UNVERIFIED",
    });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  return updated;
};

const deleteResource = async (id: string) => {
  const resource = await prisma.resource.findUnique({
    where: { id, isDeleted: false },
  });

  if (!resource) {
    throw new AppError(status.NOT_FOUND, "Resource not found.");
  }

  await prisma.resource.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return { message: "Resource removed successfully." };
};

// --- Course Management ---
const listCourses = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [courses, total] = await prisma.$transaction([
    prisma.course.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { resources: true, discussions: true } } },
    }),
    prisma.course.count(),
  ]);

  return {
    data: courses,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getCourseById = async (id: string) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { resources: true, discussions: true } } },
  });

  if (!course) {
    throw new AppError(status.NOT_FOUND, "Course not found.");
  }

  return course;
};

const createCourse = async (data: {
  code: string;
  name: string;
  department: string;
  semester?: number;
  description?: string;
}) => {
  const existing = await prisma.course.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    throw new AppError(status.CONFLICT, "Course with this code already exists.");
  }

  const course = await prisma.course.create({
    data: {
      code: data.code,
      name: data.name,
      department: data.department as never,
      semester: data.semester ?? null,
      description: data.description ?? null,
    },
  });

  return course;
};

const updateCourse = async (
  id: string,
  data: Record<string, unknown>,
) => {
  const course = await prisma.course.findUnique({ where: { id } });

  if (!course) {
    throw new AppError(status.NOT_FOUND, "Course not found.");
  }

  if (data.code && data.code !== course.code) {
    const duplicate = await prisma.course.findUnique({
      where: { code: data.code as string },
    });
    if (duplicate) {
      throw new AppError(status.CONFLICT, "Course with this code already exists.");
    }
  }

  const updated = await prisma.course.update({
    where: { id },
    data,
  });

  return updated;
};

const deleteCourse = async (id: string) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { resources: true, discussions: true } } },
  });

  if (!course) {
    throw new AppError(status.NOT_FOUND, "Course not found.");
  }

  if (course._count.resources > 0 || course._count.discussions > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete a course with associated resources or discussions.",
    );
  }

  await prisma.course.delete({ where: { id } });

  return { message: "Course deleted successfully." };
};

// --- Resource Category Management ---
const listResourceCategories = async (page = 1, limit = 50) => {
  const skip = (page - 1) * limit;

  const [categories, total] = await prisma.$transaction([
    prisma.resourceCategory.findMany({
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { _count: { select: { resources: true } } },
    }),
    prisma.resourceCategory.count(),
  ]);

  return {
    data: categories,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getResourceCategoryById = async (id: string) => {
  const category = await prisma.resourceCategory.findUnique({
    where: { id },
    include: { _count: { select: { resources: true } } },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Resource category not found.");
  }

  return category;
};

const createResourceCategory = async (data: {
  name: string;
  icon?: string;
  description?: string;
}) => {
  const slug = data.name.toLowerCase().replace(/\s+/g, "-");
  const existing = await prisma.resourceCategory.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new AppError(status.CONFLICT, "Category with this name already exists.");
  }

  const category = await prisma.resourceCategory.create({
    data: {
      name: data.name,
      slug,
      icon: data.icon ?? null,
      description: data.description ?? null,
    },
  });

  return category;
};

const updateResourceCategory = async (
  id: string,
  data: Record<string, unknown>,
) => {
  const category = await prisma.resourceCategory.findUnique({ where: { id } });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Resource category not found.");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = (data.name as string).toLowerCase().replace(/\s+/g, "-");
  }
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.description !== undefined) updateData.description = data.description;

  const updated = await prisma.resourceCategory.update({
    where: { id },
    data: updateData,
  });

  return updated;
};

const deleteResourceCategory = async (id: string) => {
  const category = await prisma.resourceCategory.findUnique({
    where: { id },
    include: { _count: { select: { resources: true } } },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Resource category not found.");
  }

  if (category._count.resources > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete a category with associated resources.",
    );
  }

  await prisma.resourceCategory.delete({ where: { id } });

  return { message: "Resource category deleted successfully." };
};

// --- Discussion Category Management ---
const listDiscussionCategories = async (page = 1, limit = 50) => {
  const skip = (page - 1) * limit;

  const [categories, total] = await prisma.$transaction([
    prisma.discussionCategory.findMany({
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { _count: { select: { discussions: true } } },
    }),
    prisma.discussionCategory.count(),
  ]);

  return {
    data: categories,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getDiscussionCategoryById = async (id: string) => {
  const category = await prisma.discussionCategory.findUnique({
    where: { id },
    include: { _count: { select: { discussions: true } } },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Discussion category not found.");
  }

  return category;
};

const createDiscussionCategory = async (data: {
  name: string;
  icon?: string;
}) => {
  const slug = data.name.toLowerCase().replace(/\s+/g, "-");
  const existing = await prisma.discussionCategory.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new AppError(status.CONFLICT, "Category with this name already exists.");
  }

  const category = await prisma.discussionCategory.create({
    data: {
      name: data.name,
      slug,
      icon: data.icon ?? null,
    },
  });

  return category;
};

const updateDiscussionCategory = async (
  id: string,
  data: Record<string, unknown>,
) => {
  const category = await prisma.discussionCategory.findUnique({ where: { id } });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Discussion category not found.");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = (data.name as string).toLowerCase().replace(/\s+/g, "-");
  }
  if (data.icon !== undefined) updateData.icon = data.icon;

  const updated = await prisma.discussionCategory.update({
    where: { id },
    data: updateData,
  });

  return updated;
};

const deleteDiscussionCategory = async (id: string) => {
  const category = await prisma.discussionCategory.findUnique({
    where: { id },
    include: { _count: { select: { discussions: true } } },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Discussion category not found.");
  }

  if (category._count.discussions > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete a category with associated discussions.",
    );
  }

  await prisma.discussionCategory.delete({ where: { id } });

  return { message: "Discussion category deleted successfully." };
};

// --- Question Category Management ---
const listQuestionCategories = async (page = 1, limit = 50) => {
  const skip = (page - 1) * limit;

  const [categories, total] = await prisma.$transaction([
    prisma.questionCategory.findMany({
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.questionCategory.count(),
  ]);

  return {
    data: categories,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getQuestionCategoryById = async (id: string) => {
  const category = await prisma.questionCategory.findUnique({
    where: { id },
    include: { _count: { select: { questions: true } } },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Question category not found.");
  }

  return category;
};

const createQuestionCategory = async (data: {
  name: string;
  icon?: string;
}) => {
  const slug = data.name.toLowerCase().replace(/\s+/g, "-");
  const existing = await prisma.questionCategory.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new AppError(status.CONFLICT, "Category with this name already exists.");
  }

  const category = await prisma.questionCategory.create({
    data: {
      name: data.name,
      slug,
      icon: data.icon ?? null,
    },
  });

  return category;
};

const updateQuestionCategory = async (
  id: string,
  data: Record<string, unknown>,
) => {
  const category = await prisma.questionCategory.findUnique({ where: { id } });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Question category not found.");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = (data.name as string).toLowerCase().replace(/\s+/g, "-");
  }
  if (data.icon !== undefined) updateData.icon = data.icon;

  const updated = await prisma.questionCategory.update({
    where: { id },
    data: updateData,
  });

  return updated;
};

const deleteQuestionCategory = async (id: string) => {
  const category = await prisma.questionCategory.findUnique({
    where: { id },
    include: { _count: { select: { questions: true } } },
  });

  if (!category) {
    throw new AppError(status.NOT_FOUND, "Question category not found.");
  }

  if (category._count.questions > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "Cannot delete a category with associated questions.",
    );
  }

  await prisma.questionCategory.delete({ where: { id } });

  return { message: "Question category deleted successfully." };
};

// --- Audit Log ---
const listAuditLogs = async (query: ListAuditLogsQuery) => {
  const {
    adminUserId,
    action,
    targetType,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (adminUserId) where.userId = adminUserId;
  if (action) where.action = action;
  if (targetType) where.entityType = targetType;

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    where.createdAt = dateFilter;
  }

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getAuditLogById = async (id: string) => {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!log) {
    throw new AppError(status.NOT_FOUND, "Audit log entry not found.");
  }

  return log;
};

export const adminService = {
  createAuditLog,
  getDashboardStats,
  getDashboardCharts,
  listUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  listResources,
  verifyResource,
  deleteResource,
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  listResourceCategories,
  getResourceCategoryById,
  createResourceCategory,
  updateResourceCategory,
  deleteResourceCategory,
  listDiscussionCategories,
  getDiscussionCategoryById,
  createDiscussionCategory,
  updateDiscussionCategory,
  deleteDiscussionCategory,
  listQuestionCategories,
  getQuestionCategoryById,
  createQuestionCategory,
  updateQuestionCategory,
  deleteQuestionCategory,
  listAuditLogs,
  getAuditLogById,
};
