import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { Prisma } from "../../../generated/prisma/client";
import {
  AcademicStatus,
  AdmissionSemester,
  Department,
  NotificationType,
  UserRole,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { getSocketServer } from "../../lib/socket/socket-server";
import { softDelete } from "../../shared/softDelete";
import { notificationService } from "../notification/notification.service";
import {
  ListUsersQuery,
  ListAlumniQuery,
  ListResourcesQuery,
  ListJobsQuery,
  ListAuditLogsQuery,
  ListDiscussionsQuery,
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
    totalJobs,
    totalAlumni,
    pendingVerifications,
    totalResourcesByVerification,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.resource.count({ where: { isDeleted: false } }),
    prisma.discussion.count({ where: { isDeleted: false } }),
    prisma.question.count({ where: { isDeleted: false } }),
    prisma.event.count(),
    prisma.jobPost.count(),
    prisma.user.count({ where: { role: "ALUMNI", isDeleted: false } }),
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
    totalJobs,
    totalAlumni,
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

// --- Graduation & Alumni Management ---
const markGraduation = async (
  id: string,
  adminId: string,
  data: {
    graduationYear: number;
    graduationSemester: AdmissionSemester;
    degreeTitle?: string;
    cgpa?: number;
    graduationDate?: Date;
  },
) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { student: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  if (user.role !== UserRole.STUDENT) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only students can be marked as graduated.",
    );
  }

  if (!user.student) {
    throw new AppError(
      status.BAD_REQUEST,
      "User does not have a student record.",
    );
  }

  if (user.student.academicStatus === AcademicStatus.GRADUATED) {
    throw new AppError(
      status.CONFLICT,
      "This student is already marked as graduated.",
    );
  }

  const student = await prisma.student.update({
    where: { id: user.student.id },
    data: {
      academicStatus: AcademicStatus.GRADUATED,
      graduationYear: data.graduationYear,
      graduationSemester: data.graduationSemester,
      degreeTitle: data.degreeTitle ?? null,
      cgpa: data.cgpa ?? null,
      graduationDate: data.graduationDate ?? null,
      graduatedById: adminId,
      graduatedAt: new Date(),
    },
    include: { graduatedBy: { select: { id: true, name: true } } },
  });

  await notificationService.createNotification({
    userId: id,
    type: NotificationType.GRADUATION_MARKED,
    title: "Graduation Recorded",
    message:
      "Your graduation has been recorded. Complete the transition to join the alumni community.",
    link: "/home",
  });

  return student;
};

const undoGraduation = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { student: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  if (user.role !== UserRole.STUDENT) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only active student graduations can be undone.",
    );
  }

  if (!user.student) {
    throw new AppError(
      status.BAD_REQUEST,
      "User does not have a student record.",
    );
  }

  if (user.student.academicStatus !== AcademicStatus.GRADUATED) {
    throw new AppError(
      status.BAD_REQUEST,
      "This student is not marked as graduated.",
    );
  }

  const student = await prisma.student.update({
    where: { id: user.student.id },
    data: {
      academicStatus: AcademicStatus.ENROLLED,
      graduationYear: null,
      graduationSemester: null,
      graduationDate: null,
      degreeTitle: null,
      cgpa: null,
      graduatedById: null,
      graduatedAt: null,
    },
  });

  return student;
};

const batchGraduation = async (
  adminId: string,
  data: {
    department?: Department;
    admissionYear?: number;
    admissionSemester?: AdmissionSemester;
    graduationYear: number;
    graduationSemester: AdmissionSemester;
  },
) => {
  const where: Prisma.StudentWhereInput = {
    academicStatus: AcademicStatus.ENROLLED,
    user: { role: UserRole.STUDENT, isDeleted: false },
  };

  if (data.department) where.department = data.department;
  if (data.admissionYear) where.admissionYear = data.admissionYear;
  if (data.admissionSemester) where.admissionSemester = data.admissionSemester;

  const matched = await prisma.student.findMany({
    where,
    select: { id: true, userId: true },
  });

  if (matched.length === 0) {
    throw new AppError(status.NOT_FOUND, "No matching students found.");
  }

  await prisma.student.updateMany({
    where: { id: { in: matched.map((s) => s.id) } },
    data: {
      academicStatus: AcademicStatus.GRADUATED,
      graduationYear: data.graduationYear,
      graduationSemester: data.graduationSemester,
      graduatedById: adminId,
      graduatedAt: new Date(),
    },
  });

  for (const s of matched) {
    await notificationService.createNotification({
      userId: s.userId,
      type: NotificationType.GRADUATION_MARKED,
      title: "Graduation Recorded",
      message: `Your graduation (${data.graduationYear} ${data.graduationSemester}) has been recorded. Complete the transition to join the alumni community.`,
      link: "/home",
    });
  }

  return { count: matched.length };
};

const revertAlumni = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { student: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  if (user.role !== UserRole.ALUMNI) {
    throw new AppError(status.BAD_REQUEST, "This user is not an alumnus.");
  }

  if (!user.student) {
    throw new AppError(
      status.BAD_REQUEST,
      "Alumni user does not have a student record.",
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { role: UserRole.STUDENT },
    }),
    prisma.student.update({
      where: { id: user.student.id },
      data: {
        academicStatus: AcademicStatus.ENROLLED,
        graduationYear: null,
        graduationSemester: null,
        graduationDate: null,
        degreeTitle: null,
        cgpa: null,
        graduatedById: null,
        graduatedAt: null,
        transitionConfirmedAt: null,
      },
    }),
  ]);

  return { message: "Alumni status reverted to student successfully." };
};

const listAlumni = async (query: ListAlumniQuery) => {
  const {
    department,
    graduationYear,
    industry,
    currentEmployer,
    q,
    page = 1,
    limit = 20,
  } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    role: UserRole.ALUMNI,
    isDeleted: false,
    student: {
      is: {
        ...(department ? { department: department as Department } : {}),
        ...(graduationYear ? { graduationYear } : {}),
      },
    },
    profile: {
      is: {
        ...(industry
          ? { industry: { contains: industry, mode: "insensitive" } }
          : {}),
        ...(currentEmployer
          ? {
              currentEmployer: {
                contains: currentEmployer,
                mode: "insensitive",
              },
            }
          : {}),
      },
    },
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      {
        student: {
          is: { studentId: { contains: q, mode: "insensitive" } },
        },
      },
    ];
  }

  const [alumni, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        student: {
          select: {
            department: true,
            admissionYear: true,
            admissionSemester: true,
            academicStatus: true,
            graduationYear: true,
            graduationSemester: true,
            degreeTitle: true,
            cgpa: true,
            transitionConfirmedAt: true,
          },
        },
        profile: {
          select: {
            currentEmployer: true,
            jobTitle: true,
            industry: true,
            location: true,
            showInAlumniDirectory: true,
            isMentor: true,
            mentorshipTopics: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: alumni,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
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

// --- Job Post Management ---
const listJobs = async (query: ListJobsQuery) => {
  const { search, status: jobStatus, isVerified, page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.JobPostWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (jobStatus) where.status = jobStatus as "OPEN" | "FILLED" | "CLOSED";
  if (isVerified !== undefined) where.isVerified = isVerified;

  const [jobs, total] = await prisma.$transaction([
    prisma.jobPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        postedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: { select: { applications: true } },
      },
    }),
    prisma.jobPost.count({ where }),
  ]);

  return {
    data: jobs,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const verifyJob = async (id: string, isVerified: boolean) => {
  const job = await prisma.jobPost.findUnique({
    where: { id },
  });

  if (!job) {
    throw new AppError(status.NOT_FOUND, "Job post not found.");
  }

  const updated = await prisma.jobPost.update({
    where: { id },
    data: { isVerified },
    include: {
      postedBy: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { applications: true } },
    },
  });

  try {
    const io = getSocketServer();
    io.emit("admin:review-update", {
      type: "job",
      entityId: id,
      status: isVerified ? "VERIFIED" : "UNVERIFIED",
    });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  return updated;
};

const deleteJob = async (id: string) => {
  const job = await prisma.jobPost.findUnique({
    where: { id },
  });

  if (!job) {
    throw new AppError(status.NOT_FOUND, "Job post not found.");
  }

  await prisma.jobPost.delete({ where: { id } });

  return { message: "Job post removed successfully." };
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

// --- Discussion Management ---
const listDiscussions = async (query: ListDiscussionsQuery) => {
  const { search, status, sort = "newest", page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isDeleted: false };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status === "pinned") where.isPinned = true;
  if (status === "locked") where.isLocked = true;
  if (status === "solved") where.isSolved = true;

  const orderBy: Record<string, unknown> =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "popular"
        ? { upvoteCount: "desc" }
        : sort === "replies"
          ? { replyCount: "desc" }
          : { createdAt: "desc" };

  const [discussions, total] = await prisma.$transaction([
    prisma.discussion.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        author: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true, slug: true } },
        course: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.discussion.count({ where }),
  ]);

  return {
    data: discussions,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const deleteDiscussion = async (id: string) => {
  const discussion = await prisma.discussion.findUnique({
    where: { id, isDeleted: false },
  });

  if (!discussion) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  await softDelete(prisma.discussion, id);

  return { message: "Discussion deleted successfully." };
};

const togglePin = async (id: string) => {
  const discussion = await prisma.discussion.findUnique({
    where: { id, isDeleted: false },
  });

  if (!discussion) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  const updated = await prisma.discussion.update({
    where: { id },
    data: { isPinned: !discussion.isPinned },
    select: { isPinned: true },
  });

  return updated;
};

const toggleLock = async (id: string) => {
  const discussion = await prisma.discussion.findUnique({
    where: { id, isDeleted: false },
  });

  if (!discussion) {
    throw new AppError(status.NOT_FOUND, "Discussion not found.");
  }

  const updated = await prisma.discussion.update({
    where: { id },
    data: { isLocked: !discussion.isLocked },
    select: { isLocked: true },
  });

  return updated;
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
  markGraduation,
  undoGraduation,
  batchGraduation,
  revertAlumni,
  listAlumni,
  listResources,
  verifyResource,
  deleteResource,
  listJobs,
  verifyJob,
  deleteJob,
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
  listDiscussions,
  deleteDiscussion,
  togglePin,
  toggleLock,
  listAuditLogs,
  getAuditLogById,
};
