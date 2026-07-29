import { StatusCodes } from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import type {
  UpdatePrivacySettingsInput,
  UpdateNotificationSettingsInput,
  ChangePasswordInput,
  RequestExportInput,
} from "./settings.interface";
import {
  calculatePaginationMeta,
  buildPaginationQuery,
} from "../../utils/pagination";
import type {
  ProfileVisibilityLevel,
  ConnectionRequestPolicy,
  MessagingPolicy,
} from "../../../generated/prisma/enums";

const getPrivacySettings = async (userId: string) => {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    const created = await prisma.userSettings.create({
      data: { userId },
    });
    return created;
  }

  return settings;
};

const updatePrivacySettings = async (
  userId: string,
  data: UpdatePrivacySettingsInput,
) => {
  const updateData: Record<string, unknown> = {};
  if (data.showProfile !== undefined) updateData.showProfile = data.showProfile as ProfileVisibilityLevel;
  if (data.showAcademicInfo !== undefined) updateData.showAcademicInfo = data.showAcademicInfo as ProfileVisibilityLevel;
  if (data.showSkills !== undefined) updateData.showSkills = data.showSkills as ProfileVisibilityLevel;
  if (data.showProjects !== undefined) updateData.showProjects = data.showProjects as ProfileVisibilityLevel;
  if (data.showReputation !== undefined) updateData.showReputation = data.showReputation as ProfileVisibilityLevel;
  if (data.showBadges !== undefined) updateData.showBadges = data.showBadges as ProfileVisibilityLevel;
  if (data.showSocialLinks !== undefined) updateData.showSocialLinks = data.showSocialLinks as ProfileVisibilityLevel;
  if (data.connectionRequestPolicy !== undefined) updateData.connectionRequestPolicy = data.connectionRequestPolicy as ConnectionRequestPolicy;
  if (data.messagingPolicy !== undefined) updateData.messagingPolicy = data.messagingPolicy as MessagingPolicy;
  if (data.allowMessageRequests !== undefined) updateData.allowMessageRequests = data.allowMessageRequests;
  if (data.showOnlineStatus !== undefined) updateData.showOnlineStatus = data.showOnlineStatus;
  if (data.showLastActive !== undefined) updateData.showLastActive = data.showLastActive;
  if (data.readReceipts !== undefined) updateData.readReceipts = data.readReceipts;
  if (data.searchableProfile !== undefined) updateData.searchableProfile = data.searchableProfile;
  if (data.appearInRecommendations !== undefined) updateData.appearInRecommendations = data.appearInRecommendations;

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: updateData,
    create: { userId },
  });

  return settings;
};

const getNotificationSettings = async (userId: string) => {
  const settings = await prisma.userNotificationSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    const created = await prisma.userNotificationSettings.create({
      data: { userId },
    });
    return created;
  }

  return settings;
};

const updateNotificationSettings = async (
  userId: string,
  data: UpdateNotificationSettingsInput,
) => {
  const settings = await prisma.userNotificationSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  return settings;
};

const changePassword = async (
  userId: string,
  data: ChangePasswordInput,
  headers: Record<string, string>,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found.");
  }

  try {
    await auth.api.changePassword({
      headers: fromNodeHeaders(headers),
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
    });
  } catch {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Current password is incorrect.",
    );
  }
};

const getActiveSessions = async (userId: string, currentSessionId: string) => {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { updatedAt: "desc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    isCurrent: session.id === currentSessionId,
  }));
};

const terminateSession = async (
  userId: string,
  sessionId: string,
  currentSessionId: string,
) => {
  if (sessionId === currentSessionId) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Cannot terminate your current session. Use logout instead.",
    );
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Session not found.");
  }

  await prisma.session.delete({ where: { id: sessionId } });
};

const terminateOtherSessions = async (
  userId: string,
  currentSessionId: string,
) => {
  await prisma.session.deleteMany({
    where: {
      userId,
      id: { not: currentSessionId },
    },
  });
};

const getLoginHistory = async (userId: string, page = 1, limit = 20) => {
  const { skip, take } = buildPaginationQuery({
    page,
    limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [entries, total] = await Promise.all([
    prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.loginHistory.count({ where: { userId } }),
  ]);

  const meta = calculatePaginationMeta(total, page, limit);

  return {
    data: entries.map((entry) => ({
      id: entry.id,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      success: entry.success,
      failureReason: entry.failureReason,
      createdAt: entry.createdAt.toISOString(),
    })),
    meta,
  };
};

const requestExport = async (userId: string, data: RequestExportInput) => {
  const job = await prisma.dataExport.create({
    data: {
      userId,
      type: data.type,
      status: "PROCESSING",
    },
  });

  // In a real implementation, this would trigger a background job.
  // For now, simulate completion immediately.
  await prisma.dataExport.update({
    where: { id: job.id },
    data: {
      status: "COMPLETED",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return { jobId: job.id, status: "COMPLETED" };
};

const getExportStatus = async (userId: string, jobId: string) => {
  const job = await prisma.dataExport.findUnique({
    where: { id: jobId },
  });

  if (!job || job.userId !== userId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Export job not found.");
  }

  return {
    jobId: job.id,
    type: job.type,
    status: job.status,
    fileUrl: job.fileUrl,
    expiresAt: job.expiresAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
};

const downloadExport = async (userId: string, jobId: string) => {
  const job = await prisma.dataExport.findUnique({
    where: { id: jobId },
  });

  if (!job || job.userId !== userId) {
    throw new AppError(StatusCodes.NOT_FOUND, "Export job not found.");
  }

  if (job.status !== "COMPLETED") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Export is not ready for download.",
    );
  }

  return { downloadUrl: job.fileUrl };
};

const requestArchive = async (userId: string) => {
  // Verify password via better-auth (simplified — in production verify against auth)
  const job = await prisma.dataExport.create({
    data: {
      userId,
      type: "ARCHIVE",
      status: "PROCESSING",
    },
  });

  // Simulate immediate completion
  await prisma.dataExport.update({
    where: { id: job.id },
    data: { status: "COMPLETED" },
  });

  return { jobId: job.id };
};

const deactivateAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found.");
  }

  if (user.isDeactivated) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Account is already deactivated.",
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isDeactivated: true,
      deactivationRequestedAt: new Date(),
    },
  });

  // Terminate all sessions except current (handled by caller)
  await prisma.session.deleteMany({ where: { userId } });
};

const reactivateAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found.");
  }

  if (!user.isDeactivated) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Account is not deactivated.",
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isDeactivated: false,
      deactivationRequestedAt: null,
    },
  });
};

const requestDeletion = async (
  userId: string,
  _password: string,
  reason?: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found.");
  }

  if (user.scheduledDeletionAt) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Deletion is already scheduled.",
    );
  }

  // Schedule deletion for 30 days from now
  const scheduledDeletionAt = new Date();
  scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);

  await prisma.user.update({
    where: { id: userId },
    data: {
      scheduledDeletionAt,
    },
  });

  // Log the reason if provided (stored for audit purposes)
  if (reason) {
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: "ACCOUNT_DELETION_REQUESTED",
        entityType: "User",
        entityId: userId,
        details: { reason },
      },
    });
  }

  return { scheduledDeletionAt: scheduledDeletionAt.toISOString() };
};

const cancelDeletion = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found.");
  }

  if (!user.scheduledDeletionAt) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "No deletion is scheduled.",
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      scheduledDeletionAt: null,
    },
  });

  // Log the cancellation
  await prisma.auditLog.create({
    data: {
      userId: userId,
      action: "ACCOUNT_DELETION_CANCELLED",
      entityType: "User",
      entityId: userId,
    },
  });
};

const recordLoginHistory = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  success = true,
  failureReason?: string,
) => {
  await prisma.loginHistory.create({
    data: {
      userId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      success,
      failureReason: failureReason ?? null,
    },
  });
};

export const settingsService = {
  getPrivacySettings,
  updatePrivacySettings,
  getNotificationSettings,
  updateNotificationSettings,
  changePassword,
  getActiveSessions,
  terminateSession,
  terminateOtherSessions,
  getLoginHistory,
  requestExport,
  getExportStatus,
  downloadExport,
  requestArchive,
  deactivateAccount,
  reactivateAccount,
  requestDeletion,
  cancelDeletion,
  recordLoginHistory,
};
