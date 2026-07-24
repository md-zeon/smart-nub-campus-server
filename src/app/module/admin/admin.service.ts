import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { getSocketServer } from "../../lib/socket/socket-server";
import { softDelete } from "../../shared/softDelete";
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

  await softDelete(prisma.user, id);

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

  await softDelete(prisma.resource, id);

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

// --- Category CRUD Factory (DRY for resource/discussion/question categories) ---
interface CategoryModel {
  findMany: (args: unknown) => Promise<unknown[]>;
  count: () => Promise<number>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<unknown>;
}

function createCategoryCRUD(
  model: CategoryModel,
  label: string,
  childCountField: string,
  extraCreateFields?: string[],
) {
  const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, "-");

  return {
    list: async (page = 1, limit = 50) => {
      const skip = (page - 1) * limit;
      const [categories, total] = await Promise.all([
        model.findMany({
          skip,
          take: limit,
          orderBy: { name: "asc" },
          include: { _count: { select: { [childCountField]: true } } },
        }),
        model.count(),
      ]);
      return {
        data: categories,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    getById: async (id: string) => {
      const category = await model.findUnique({
        where: { id },
        include: { _count: { select: { [childCountField]: true } } },
      });
      if (!category) {
        throw new AppError(status.NOT_FOUND, `${label} not found.`);
      }
      return category;
    },

    create: async (data: Record<string, unknown>) => {
      const slug = slugify(data.name as string);
      const existing = await model.findUnique({ where: { slug } });
      if (existing) {
        throw new AppError(status.CONFLICT, "Category with this name already exists.");
      }
      const createData: Record<string, unknown> = {
        name: data.name,
        slug,
        icon: data.icon ?? null,
      };
      for (const field of extraCreateFields ?? []) {
        createData[field] = data[field] ?? null;
      }
      return model.create({ data: createData });
    },

    update: async (id: string, data: Record<string, unknown>) => {
      const category = await model.findUnique({ where: { id } });
      if (!category) {
        throw new AppError(status.NOT_FOUND, `${label} not found.`);
      }
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) {
        updateData.name = data.name;
        updateData.slug = slugify(data.name as string);
      }
      if (data.icon !== undefined) updateData.icon = data.icon;
      for (const field of extraCreateFields ?? []) {
        if (data[field] !== undefined) updateData[field] = data[field];
      }
      return model.update({ where: { id }, data: updateData });
    },

    delete: async (id: string) => {
      const category = await model.findUnique({
        where: { id },
        include: { _count: { select: { [childCountField]: true } } },
      }) as Record<string, unknown> | null;
      if (!category) {
        throw new AppError(status.NOT_FOUND, `${label} not found.`);
      }
      const count = (category._count as Record<string, number>)[childCountField];
      if (count > 0) {
        throw new AppError(
          status.BAD_REQUEST,
          `Cannot delete a category with associated ${childCountField}.`,
        );
      }
      await model.delete({ where: { id } });
      return { message: `${label} deleted successfully.` };
    },
  };
}

const resourceCategory = createCategoryCRUD(
  prisma.resourceCategory as unknown as CategoryModel,
  "Resource category",
  "resources",
  ["description"],
);
const discussionCategory = createCategoryCRUD(
  prisma.discussionCategory as unknown as CategoryModel,
  "Discussion category",
  "discussions",
);
const questionCategory = createCategoryCRUD(
  prisma.questionCategory as unknown as CategoryModel,
  "Question category",
  "questions",
);

// --- Category Management (DRY via factory) ---
const listResourceCategories = resourceCategory.list;
const getResourceCategoryById = resourceCategory.getById;
const createResourceCategory = resourceCategory.create;
const updateResourceCategory = resourceCategory.update;
const deleteResourceCategory = resourceCategory.delete;

const listDiscussionCategories = discussionCategory.list;
const getDiscussionCategoryById = discussionCategory.getById;
const createDiscussionCategory = discussionCategory.create;
const updateDiscussionCategory = discussionCategory.update;
const deleteDiscussionCategory = discussionCategory.delete;

const listQuestionCategories = questionCategory.list;
const getQuestionCategoryById = questionCategory.getById;
const createQuestionCategory = questionCategory.create;
const updateQuestionCategory = questionCategory.update;
const deleteQuestionCategory = questionCategory.delete;

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
