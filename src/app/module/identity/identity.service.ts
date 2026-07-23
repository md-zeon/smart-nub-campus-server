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

const getPublicProfile = async (requesterId: string, targetUserId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId, isDeleted: false },
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
        },
      },
      profile: true,
      settings: {
        select: {
          showProfile: true,
          showAcademicInfo: true,
          showSocialLinks: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  const settings = user.settings;

  if (!settings || settings.showProfile === "ONLY_ME") {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  if (requesterId !== targetUserId) {
    const canView = await canViewField(
      requesterId,
      targetUserId,
      settings.showProfile,
    );
    if (!canView) {
      throw new AppError(status.NOT_FOUND, "User not found.");
    }
  }

  const result: Record<string, unknown> = {
    id: user.id,
    name: user.name,
    image: user.image,
    createdAt: user.createdAt,
  };

  if (requesterId === targetUserId || settings.showAcademicInfo === "EVERYONE") {
    result.student = user.student || null;
    if (user.profile) {
      result.currentSemester = user.profile.currentSemester;
      result.batchYear = user.profile.batchYear;
    }
  } else if (settings.showAcademicInfo !== "ONLY_ME") {
    const canSeeAcademic = await canViewField(
      requesterId,
      targetUserId,
      settings.showAcademicInfo,
    );
    if (canSeeAcademic) {
      result.student = user.student || null;
      if (user.profile) {
        result.currentSemester = user.profile.currentSemester;
        result.batchYear = user.profile.batchYear;
      }
    }
  }

  if (user.profile) {
    result.bio = user.profile.bio;
    result.coverImage = user.profile.coverImage;
    result.location = user.profile.location;
    result.phoneNumber = user.profile.phoneNumber;
  }

  if (requesterId === targetUserId || settings.showSocialLinks === "EVERYONE") {
    if (user.profile) {
      result.githubUrl = user.profile.githubUrl;
      result.linkedinUrl = user.profile.linkedinUrl;
      result.portfolioUrl = user.profile.portfolioUrl;
      result.websiteUrl = user.profile.websiteUrl;
    }
  } else if (settings.showSocialLinks !== "ONLY_ME") {
    const canSeeSocial = await canViewField(
      requesterId,
      targetUserId,
      settings.showSocialLinks,
    );
    if (canSeeSocial && user.profile) {
      result.githubUrl = user.profile.githubUrl;
      result.linkedinUrl = user.profile.linkedinUrl;
      result.portfolioUrl = user.profile.portfolioUrl;
      result.websiteUrl = user.profile.websiteUrl;
    }
  }

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
  },
) => {
  const existingProfile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    const updated = await prisma.userProfile.update({
      where: { userId },
      data,
    });
    return updated;
  }

  const created = await prisma.userProfile.create({
    data: {
      userId,
      ...data,
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
