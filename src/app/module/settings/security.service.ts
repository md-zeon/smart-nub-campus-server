import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import { auditService, AUDIT_ACTIONS } from "./audit.service";

/**
 * Change user password.
 * Verifies current password via Better Auth, then updates to the new one.
 */
const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
  ipAddress?: string,
) => {
  // Fetch user email for Better Auth password verification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found.");
  }

  // Verify current password by attempting sign-in through Better Auth
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: user.email,
        password: currentPassword,
      },
    });

    // If sign-in succeeds, the password is correct.
    // Clean up the token/session that was just created.
    if (result?.token) {
      const session = await prisma.session.findFirst({
        where: { token: result.token },
      });
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
    }
  } catch {
    throw new AppError(
      status.BAD_REQUEST,
      "Current password is incorrect.",
    );
  }

  // Update password via Better Auth
  try {
    await auth.api.changePassword({
      body: {
        newPassword,
        currentPassword,
      },
      headers: fromNodeHeaders({
        cookie: `better-auth.session_token=`,
      }),
    });
  } catch {
    // Fallback: update password through the account table directly
    // Better Auth hashes passwords internally, so we use the API
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to change password. Please try again.",
    );
  }

  // Log the password change
  await auditService.logAction({
    userId,
    action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    entityType: "USER",
    entityId: userId,
    ipAddress,
  });

  return { message: "Password changed successfully." };
};

/**
 * Get active sessions for a user.
 */
const getActiveSessions = async (userId: string) => {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return sessions;
};

/**
 * Terminate a specific session (user can only terminate their own).
 */
const terminateSession = async (
  userId: string,
  sessionId: string,
  ipAddress?: string,
) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only terminate your own sessions.",
    );
  }

  await prisma.session.delete({ where: { id: sessionId } });

  // Log the session termination
  await auditService.logAction({
    userId,
    action: AUDIT_ACTIONS.SESSION_TERMINATED,
    entityType: "SESSION",
    entityId: sessionId,
    ipAddress,
  });

  return { message: "Session terminated successfully." };
};

/**
 * Terminate all sessions except the current one.
 */
const terminateOtherSessions = async (
  userId: string,
  currentSessionId: string,
  ipAddress?: string,
) => {
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      id: { not: currentSessionId },
    },
  });

  // Log the bulk session termination
  await auditService.logAction({
    userId,
    action: AUDIT_ACTIONS.SESSIONS_TERMINATED,
    entityType: "SESSION",
    entityId: "bulk",
    details: { terminatedCount: result.count },
    ipAddress,
  });

  return {
    message: `${result.count} other session(s) terminated successfully.`,
    terminatedCount: result.count,
  };
};

/**
 * Get paginated login history for a user.
 */
const getLoginHistory = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [history, total] = await prisma.$transaction([
    prisma.loginHistory.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        success: true,
        failureReason: true,
        createdAt: true,
      },
    }),
    prisma.loginHistory.count({ where: { userId } }),
  ]);

  return {
    data: history,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Record a login attempt (success or failure).
 * Called from the auth flow to maintain login audit trail.
 */
const recordLoginAttempt = async (data: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
}) => {
  return prisma.loginHistory.create({
    data: {
      userId: data.userId,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      success: data.success,
      failureReason: data.failureReason ?? null,
    },
  });
};

export const securityService = {
  changePassword,
  getActiveSessions,
  terminateSession,
  terminateOtherSessions,
  getLoginHistory,
  recordLoginAttempt,
};
