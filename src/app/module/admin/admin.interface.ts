import { UserStatus } from "../../../generated/prisma/enums";

export interface ListUsersQuery {
  search?: string;
  role?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface ListResourcesQuery {
  search?: string;
  courseId?: string;
  categoryId?: string;
  isVerified?: boolean;
  page?: number;
  limit?: number;
}

export interface ListAuditLogsQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateAuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}
