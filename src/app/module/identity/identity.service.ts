import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "./identity.interface";
import type { ProfileVisibilityLevel } from "../../../generated/prisma/enums";

const me = (user: RequestUser) => {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender,
      image: user.image,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    student: user.student || null,
    admin: user.admin || null,
    profile: user.profile || null,
  };
};

const getProfile = async (userId: string) => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });
  return profile || null;
};

const canViewField = async (
  viewerId: string,
  targetUserId: string,
  field: ProfileVisibilityLevel,
): Promise<boolean> => {
  if (field === "EVERYONE") return true;
  if (field === "ONLY_ME") return false;

  if (field === "STUDENTS_ONLY") {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { student: { select: { id: true } } },
    });
    return !!viewer?.student;
  }

  if (field === "CONNECTIONS_ONLY") {
    const connection = await prisma.connection.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: viewerId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: viewerId },
        ],
      },
    });
    return !!connection;
  }

  return true;
};

const getPublicProfile = async (requesterId: string, targetUserId: string, previewMode = false) => {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId, isDeleted: false },
    select: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
      gender: true,
      student: {
        select: {
          studentId: true,
          department: true,
          admissionYear: true,
          admissionSemester: true,
        },
      },
      profile: true,
      settings: {
        select: {
          showProfile: true,
          showAcademicInfo: true,
          showSocialLinks: true,
          showSkills: true,
          showReputation: true,
          showBadges: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  const settings = user.settings ?? {
    showProfile: "EVERYONE" as const,
    showAcademicInfo: "EVERYONE" as const,
    showSocialLinks: "EVERYONE" as const,
    showSkills: "EVERYONE" as const,
    showReputation: "EVERYONE" as const,
    showBadges: "EVERYONE" as const,
  };

  if (settings.showProfile === "ONLY_ME") {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  const isSelf = requesterId === targetUserId && !previewMode;

  if (!isSelf) {
    const canView = await canViewField(
      requesterId,
      targetUserId,
      settings.showProfile,
    );
    if (!canView) {
      throw new AppError(status.NOT_FOUND, "User not found.");
    }
  }

  // Build the nested profile object
  const profile: Record<string, unknown> = {};
  if (user.profile) {
    profile.bio = user.profile.bio;
    profile.coverImage = user.profile.coverImage;
    profile.location = user.profile.location;
    profile.phoneNumber = user.profile.phoneNumber;
  }

  // currentSemester / batchYear — tied to academic info visibility
  if (isSelf || settings.showAcademicInfo === "EVERYONE") {
    if (user.profile) {
      profile.currentSemester = user.profile.currentSemester;
      profile.batchYear = user.profile.batchYear;
    }
  } else if (settings.showAcademicInfo !== "ONLY_ME") {
    const canSeeAcademic = await canViewField(
      requesterId,
      targetUserId,
      settings.showAcademicInfo,
    );
    if (canSeeAcademic && user.profile) {
      profile.currentSemester = user.profile.currentSemester;
      profile.batchYear = user.profile.batchYear;
    }
  }

  // Social links — visibility-controlled, nested inside profile
  if (isSelf || settings.showSocialLinks === "EVERYONE") {
    if (user.profile) {
      profile.githubUrl = user.profile.githubUrl;
      profile.linkedinUrl = user.profile.linkedinUrl;
      profile.portfolioUrl = user.profile.portfolioUrl;
      profile.websiteUrl = user.profile.websiteUrl;
    }
  } else if (settings.showSocialLinks !== "ONLY_ME") {
    const canSeeSocial = await canViewField(
      requesterId,
      targetUserId,
      settings.showSocialLinks,
    );
    if (canSeeSocial && user.profile) {
      profile.githubUrl = user.profile.githubUrl;
      profile.linkedinUrl = user.profile.linkedinUrl;
      profile.portfolioUrl = user.profile.portfolioUrl;
      profile.websiteUrl = user.profile.websiteUrl;
    }
  }

  const result: Record<string, unknown> = {
    id: user.id,
    name: user.name,
    image: user.image,
    createdAt: user.createdAt,
    gender: user.gender,
    profile: Object.keys(profile).length > 0 ? profile : null,
  };

  // Academic info (student record) — visibility-controlled
  if (isSelf || settings.showAcademicInfo === "EVERYONE") {
    result.student = user.student || null;
  } else if (settings.showAcademicInfo !== "ONLY_ME") {
    const canSeeAcademic = await canViewField(
      requesterId,
      targetUserId,
      settings.showAcademicInfo,
    );
    if (canSeeAcademic) {
      result.student = user.student || null;
    }
  }

  // Skills
  if (isSelf || settings.showSkills === "EVERYONE") {
    const skills = await prisma.userSkill.findMany({
      where: { userId: targetUserId },
      include: { tag: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    result.skills = skills.map((s) => ({ id: s.tag.id, name: s.tag.name, userSkillId: s.id }));
  } else if (settings.showSkills !== "ONLY_ME") {
    const canSeeSkills = await canViewField(
      requesterId,
      targetUserId,
      settings.showSkills,
    );
    if (canSeeSkills) {
      const skills = await prisma.userSkill.findMany({
        where: { userId: targetUserId },
        include: { tag: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      result.skills = skills.map((s) => ({ id: s.tag.id, name: s.tag.name, userSkillId: s.id }));
    }
  }

  // Stats (points + connection count)
  if (isSelf || settings.showReputation === "EVERYONE") {
    const [pointsResult, connectionCount] = await Promise.all([
      prisma.reputationPoint.aggregate({
        where: { userId: targetUserId },
        _sum: { points: true },
      }),
      prisma.connection.count({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: targetUserId }, { receiverId: targetUserId }],
        },
      }),
    ]);
    result.stats = {
      totalPoints: Math.max(pointsResult._sum.points ?? 0, 0),
      connectionCount,
    };
  } else if (settings.showReputation !== "ONLY_ME") {
    const canSeeReputation = await canViewField(
      requesterId,
      targetUserId,
      settings.showReputation,
    );
    if (canSeeReputation) {
      const [pointsResult, connectionCount] = await Promise.all([
        prisma.reputationPoint.aggregate({
          where: { userId: targetUserId },
          _sum: { points: true },
        }),
        prisma.connection.count({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: targetUserId }, { receiverId: targetUserId }],
          },
        }),
      ]);
      result.stats = {
        totalPoints: Math.max(pointsResult._sum.points ?? 0, 0),
        connectionCount,
      };
    }
  }

  // Badges (top 3)
  if (isSelf || settings.showBadges === "EVERYONE") {
    const badges = await prisma.userBadge.findMany({
      where: { userId: targetUserId },
      include: { badge: true },
      orderBy: { unlockedAt: "desc" },
      take: 3,
    });
    const totalBadges = await prisma.userBadge.count({
      where: { userId: targetUserId },
    });
    result.badges = { items: badges, total: totalBadges };
  } else if (settings.showBadges !== "ONLY_ME") {
    const canSeeBadges = await canViewField(
      requesterId,
      targetUserId,
      settings.showBadges,
    );
    if (canSeeBadges) {
      const badges = await prisma.userBadge.findMany({
        where: { userId: targetUserId },
        include: { badge: true },
        orderBy: { unlockedAt: "desc" },
        take: 3,
      });
      const totalBadges = await prisma.userBadge.count({
        where: { userId: targetUserId },
      });
      result.badges = { items: badges, total: totalBadges };
    }
  }

  // Content counts (resources, discussions, questions)
  const [resourcesCount, discussionsCount, questionsCount] = await Promise.all([
    prisma.resource.count({ where: { uploaderId: targetUserId, isDeleted: false } }),
    prisma.discussion.count({ where: { authorId: targetUserId, isDeleted: false } }),
    prisma.question.count({ where: { authorId: targetUserId, isDeleted: false } }),
  ]);
  result.contentCounts = {
    resources: resourcesCount,
    discussions: discussionsCount,
    questions: questionsCount,
  };

  return result;
};

const updateProfile = async (
  userId: string,
  data: {
    bio?: string;
    coverImage?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    websiteUrl?: string;
    location?: string;
    phoneNumber?: string;
    currentSemester?: number;
    batchYear?: number;
    image?: string;
  },
) => {
  // image lives on the User model, not UserProfile
  const { image, ...profileData } = data;

  if (image) {
    await prisma.user.update({
      where: { id: userId },
      data: { image },
    });
  }

  const existingProfile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    const updated = await prisma.userProfile.update({
      where: { userId },
      data: profileData,
    });
    return updated;
  }

  const created = await prisma.userProfile.create({
    data: {
      userId,
      ...profileData,
    },
  });
  return created;
};

export const identityService = {
  me,
  getProfile,
  getPublicProfile,
  updateProfile,
};
