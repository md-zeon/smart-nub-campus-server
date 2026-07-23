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
  adminUserId?: string;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateAuditLogInput {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface DashboardChartsQuery {
  days?: number;
}

export interface ChartBucket {
  date: string;
  count: number;
}

export interface DepartmentBucket {
  department: string;
  count: number;
}
