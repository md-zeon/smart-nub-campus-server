import { prisma } from "../../lib/prisma";

// Action constants for audit logging
export const AUDIT_ACTIONS = {
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  SESSION_TERMINATED: "SESSION_TERMINATED",
  SESSIONS_TERMINATED: "SESSIONS_TERMINATED",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",
  ACCOUNT_REACTIVATED: "ACCOUNT_REACTIVATED",
  ACCOUNT_DELETION_REQUESTED: "ACCOUNT_DELETION_REQUESTED",
  ACCOUNT_DELETION_CANCELLED: "ACCOUNT_DELETION_CANCELLED",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
  DATA_EXPORTED: "DATA_EXPORTED",
  ARCHIVE_REQUESTED: "ARCHIVE_REQUESTED",
  PRIVACY_SETTINGS_UPDATED: "PRIVACY_SETTINGS_UPDATED",
  NOTIFICATION_SETTINGS_UPDATED: "NOTIFICATION_SETTINGS_UPDATED",
} as const;

export type AuditAction =
  (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

interface LogActionParams {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Create an audit log entry for tracking user account actions.
 * All security and account mutations should call this function.
 */
const logAction = async (params: LogActionParams) => {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details ? JSON.parse(JSON.stringify(params.details)) : undefined,
      ipAddress: params.ipAddress ?? null,
    },
  });
};

export const auditService = {
  logAction,
  AUDIT_ACTIONS,
};
