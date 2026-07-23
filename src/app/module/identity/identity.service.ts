import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "./identity.interface";

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

const getPublicProfile = async (targetUserId: string) => {
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
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  return user;
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
