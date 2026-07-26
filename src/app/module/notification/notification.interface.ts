import { NotificationType } from "../../../generated/prisma/enums";

export interface CreateNotificationInput {
  userId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}
