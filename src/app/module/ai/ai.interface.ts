/**
 * AI module TypeScript interfaces.
 * Keep in sync with Prisma schema: prisma/schema/ai.prisma
 */

export interface CreateSessionInput {
  userId: string;
  title?: string;
}

export interface SendMessageInput {
  sessionId: string;
  content: string;
  userId: string;
}

export interface GetMessagesInput {
  sessionId: string;
  userId: string;
  page?: number;
  limit?: number;
}

export interface GetSessionsInput {
  userId: string;
  page?: number;
  limit?: number;
}

export interface StudyStatsResponse {
  id: string | null;
  userId: string;
  weekStart: Date;
  questionsAsked: number;
  timeSpentMinutes: number;
  topicsExplored: number;
  quizzesGenerated: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionListResponse {
  sessions: Array<{
    id: string;
    title: string | null;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    messageCount: number;
    createdAt: Date;
    aiMessages: Array<{
      content: string;
      role: string;
    }>;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
