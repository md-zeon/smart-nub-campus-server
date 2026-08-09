import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import {
  AcademicStatus,
  Department,
  NotificationType,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { notificationService } from "../notification/notification.service";
import { DirectoryQuery, DirectoryStats, GraduationInfo } from "./alumni.interface";

// Helper: build the graduation summary returned to the student
const buildGraduationInfo = (student: {
  studentId: string;
  department: GraduationInfo["department"];
  admissionYear: number;
  admissionSemester: GraduationInfo["admissionSemester"];
  academicStatus: GraduationInfo["academicStatus"];
  graduationYear: number | null;
  graduationSemester: GraduationInfo["graduationSemester"];
  graduationDate: Date | null;
  degreeTitle: string | null;
  cgpa: unknown;
  graduatedAt: Date | null;
  transitionConfirmedAt: Date | null;
  graduatedBy: { id: string; name: string } | null;
}): GraduationInfo => {
  return {
    studentId: student.studentId,
    department: student.department,
    admissionYear: student.admissionYear,
    admissionSemester: student.admissionSemester,
    academicStatus: student.academicStatus,
    graduationYear: student.graduationYear,
    graduationSemester: student.graduationSemester,
    graduationDate: student.graduationDate,
    degreeTitle: student.degreeTitle,
    cgpa:
      student.cgpa !== null && student.cgpa !== undefined
        ? String(student.cgpa)
        : null,
    graduatedAt: student.graduatedAt,
    transitionConfirmedAt: student.transitionConfirmedAt,
    graduatedBy: student.graduatedBy,
  };
};

const getTransitionStatus = async (userId: string) => {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      studentId: true,
      department: true,
      admissionYear: true,
      admissionSemester: true,
      academicStatus: true,
      graduationYear: true,
      graduationSemester: true,
      graduationDate: true,
      degreeTitle: true,
      cgpa: true,
      graduatedAt: true,
      transitionConfirmedAt: true,
      graduatedBy: { select: { id: true, name: true } },
    },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student record not found.");
  }

  const eligible = student.academicStatus === AcademicStatus.GRADUATED;

  return {
    eligible,
    graduation: buildGraduationInfo(student),
  };
};

const transitionToAlumni = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  if (user.role !== UserRole.STUDENT) {
    throw new AppError(
      status.BAD_REQUEST,
      "Only students can transition to alumni.",
    );
  }

  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true, academicStatus: true, graduationYear: true },
  });

  if (!student) {
    throw new AppError(status.NOT_FOUND, "Student record not found.");
  }

  if (student.academicStatus !== AcademicStatus.GRADUATED) {
    throw new AppError(
      status.BAD_REQUEST,
      "Graduation has not been recorded yet. Please contact the university office.",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role: UserRole.ALUMNI },
    });

    await tx.student.update({
      where: { id: student.id },
      data: {
        transitionConfirmedAt: new Date(),
      },
    });

    // Backfill the alumni batch year on the profile if it is not set yet
    if (student.graduationYear) {
      const profile = await tx.userProfile.findUnique({
        where: { userId },
        select: { batchYear: true },
      });
      if (profile && profile.batchYear === null) {
        await tx.userProfile.update({
          where: { userId },
          data: { batchYear: student.graduationYear },
        });
      }
    }

    // Award the "Alumnus" badge if it has been seeded (best-effort)
    const badge = await tx.badge.findUnique({
      where: { name: "Alumnus" },
    });
    if (badge) {
      const existing = await tx.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      });
      if (!existing) {
        await tx.userBadge.create({
          data: { userId, badgeId: badge.id },
        });
      }
    }
  });

  await notificationService.createNotification({
    userId,
    type: NotificationType.ALUMNI_TRANSITION_COMPLETE,
    title: "Welcome to the Alumni Community",
    message: "Your alumni transition is complete. Welcome aboard!",
    link: "/alumni",
  });

  return result;
};

// --- Alumni Directory (P2) ---
const listDirectory = async (query: DirectoryQuery) => {
  const {
    department,
    graduationYear,
    industry,
    location,
    q,
    page = 1,
    limit = 12,
  } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    role: UserRole.ALUMNI,
    status: UserStatus.ACTIVE,
    isDeleted: false,
    profile: {
      is: {
        showInAlumniDirectory: true,
        ...(industry
          ? { industry: { contains: industry, mode: "insensitive" } }
          : {}),
        ...(location
          ? { location: { contains: location, mode: "insensitive" } }
          : {}),
      },
    },
    student: {
      is: {
        ...(department ? { department: department as Department } : {}),
        ...(graduationYear ? { graduationYear } : {}),
      },
    },
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      {
        profile: {
          is: { jobTitle: { contains: q, mode: "insensitive" } },
        },
      },
      {
        profile: {
          is: { currentEmployer: { contains: q, mode: "insensitive" } },
        },
      },
    ];
  }

  const [alumni, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        image: true,
        student: {
          select: {
            studentId: true,
            department: true,
            graduationYear: true,
            graduationSemester: true,
            degreeTitle: true,
          },
        },
        profile: {
          select: {
            location: true,
            currentEmployer: true,
            jobTitle: true,
            industry: true,
            isMentor: true,
            mentorshipTopics: true,
            batchYear: true,
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

const getDirectoryMember = async (
  viewer: { id: string; role: UserRole },
  targetUserId: string,
) => {
  const member = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      role: UserRole.ALUMNI,
      status: UserStatus.ACTIVE,
      isDeleted: false,
      profile: { isNot: null },
    },
    select: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
      student: {
        select: {
          studentId: true,
          department: true,
          admissionYear: true,
          admissionSemester: true,
          graduationYear: true,
          graduationSemester: true,
          graduationDate: true,
          degreeTitle: true,
        },
      },
      profile: {
        select: {
          bio: true,
          coverImage: true,
          location: true,
          currentEmployer: true,
          jobTitle: true,
          industry: true,
          showInAlumniDirectory: true,
          isMentor: true,
          mentorshipTopics: true,
          batchYear: true,
        },
      },
      alumniEmployment: {
        select: {
          id: true,
          employer: true,
          title: true,
          industry: true,
          startDate: true,
          endDate: true,
          isCurrent: true,
          description: true,
        },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      },
    },
  });

  if (!member) {
    throw new AppError(status.NOT_FOUND, "Alumni member not found.");
  }

  // Privacy: members who opted out of the directory are only visible to
  // themselves, their connections, and admins.
  if (!member.profile?.showInAlumniDirectory && viewer.id !== targetUserId) {
    const isAdmin = viewer.role === UserRole.ADMIN;
    const isConnection = await prisma.connection.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: viewer.id, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: viewer.id },
        ],
      },
      select: { id: true },
    });

    if (!isAdmin && !isConnection) {
      throw new AppError(status.NOT_FOUND, "Alumni member not found.");
    }
  }

  const connectionCount = await prisma.connection.count({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: targetUserId }, { receiverId: targetUserId }],
    },
  });

  return {
    ...member,
    stats: { connectionCount },
  };
};

const getDirectoryStats = async (): Promise<DirectoryStats> => {
  const where: Prisma.UserWhereInput = {
    role: UserRole.ALUMNI,
    status: UserStatus.ACTIVE,
    isDeleted: false,
    profile: { is: { showInAlumniDirectory: true } },
    student: { isNot: null },
  };

  const members = await prisma.user.findMany({
    where,
    select: {
      student: { select: { department: true, graduationYear: true } },
      profile: { select: { industry: true } },
    },
  });

  const byDepartment = new Map<string, number>();
  const byGraduationYear = new Map<number, number>();
  const byIndustry = new Map<string, number>();

  for (const member of members) {
    const department = member.student?.department;
    if (department) {
      byDepartment.set(department, (byDepartment.get(department) ?? 0) + 1);
    }

    const graduationYear = member.student?.graduationYear;
    if (graduationYear) {
      byGraduationYear.set(
        graduationYear,
        (byGraduationYear.get(graduationYear) ?? 0) + 1,
      );
    }

    const industry = member.profile?.industry;
    if (industry) {
      byIndustry.set(industry, (byIndustry.get(industry) ?? 0) + 1);
    }
  }

  const toFacet = <T,>(map: Map<T, number>) =>
    [...map.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

  return {
    total: members.length,
    byDepartment: toFacet(byDepartment),
    byGraduationYear: toFacet(byGraduationYear),
    byIndustry: toFacet(byIndustry),
  };
};

export const alumniService = {
  getTransitionStatus,
  transitionToAlumni,
  listDirectory,
  getDirectoryMember,
  getDirectoryStats,
};
