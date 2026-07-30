import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { createProvider } from "../../lib/ai";
import type { AIProvider, ChatMessage } from "../../lib/ai";
import ENVVARS from "../../../config/env";
import { UploadService } from "../../module/upload/upload.service";

function detectToolUsage(content: string): { quizzes: boolean; flashcards: boolean } {
  try {
    const match = content.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (match) {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.cards && Array.isArray(parsed.cards) && parsed.cards.some((c: unknown) => (c as Record<string, unknown>)?.front)) {
        return { quizzes: false, flashcards: true };
      }
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return { quizzes: true, flashcards: false };
      }
    }
  } catch {}
  return { quizzes: false, flashcards: false };
}

function elapsedMinutesSince(date: Date): number {
  return Math.min(Math.ceil((Date.now() - date.getTime()) / 60000), 30);
}

const provider: AIProvider = createProvider({
  provider: ENVVARS.AI_PROVIDER,
  apiKey: ENVVARS.AI_PROVIDER_API_KEY,
  model: ENVVARS.AI_PROVIDER_MODEL,
});

const uploadService = new UploadService();

const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const buildHistory = (
  messages: Array<{ role: "USER" | "ASSISTANT"; content: string }>,
): ChatMessage[] =>
  messages.map((m) => ({
    role: m.role === "USER" ? "user" : "model",
    content: m.content,
  }));

const createSession = async (userId: string, title?: string) => {
  const session = await prisma.aIChatSession.create({
    data: {
      userId,
      title: title || "New Chat",
    },
  });
  return session;
};

const getSessions = async (
  userId: string,
  page: number = 1,
  limit: number = 20,
) => {
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    prisma.aIChatSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        aiMessages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, role: true },
        },
      },
      skip,
      take: limit,
    }),
    prisma.aIChatSession.count({ where: { userId } }),
  ]);

  return {
    sessions,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSessionById = async (sessionId: string, userId: string) => {
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
    include: { aiMessages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You do not have access to this session.",
    );
  }

  return session;
};

const deleteSession = async (sessionId: string, userId: string) => {
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You do not have access to this session.",
    );
  }

  await prisma.aIChatSession.delete({ where: { id: sessionId } });
};

const sendMessage = async (
  sessionId: string,
  content: string,
  userId: string,
) => {
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You do not have access to this session.",
    );
  }

  const weekStart = getWeekStart();

  const [userMessage, aiMessage] = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const userMsg = await tx.aIMessage.create({
        data: {
          sessionId,
          role: "USER",
          content,
        },
      });

      const pastMessages = await tx.aIMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, createdAt: true },
      });

      const history = buildHistory(pastMessages.slice(0, -1));

      const aiResponseContent = await provider.chat(history, content);

      const modelName = ENVVARS.AI_PROVIDER_MODEL;
      const aiMsg = await tx.aIMessage.create({
        data: {
          sessionId,
          role: "ASSISTANT",
          content: aiResponseContent,
          model: modelName,
        },
      });

      const prevMsg = pastMessages.length >= 2 ? pastMessages[pastMessages.length - 2] : null;
      const timeGap = prevMsg ? elapsedMinutesSince(new Date(prevMsg.createdAt)) : 0;
      const isFirstMessage = pastMessages.length <= 1;
      const toolUsage = detectToolUsage(aiResponseContent);
      const toolIncrement = (toolUsage.quizzes ? 1 : 0) + (toolUsage.flashcards ? 1 : 0);

      await tx.aIStudyStats.upsert({
        where: {
          userId_weekStart: { userId, weekStart },
        },
        create: {
          userId,
          weekStart,
          questionsAsked: 1,
          topicsExplored: isFirstMessage ? 1 : 0,
          timeSpentMinutes: timeGap || 1,
          quizzesGenerated: toolIncrement,
        },
        update: {
          questionsAsked: { increment: 1 },
          ...(isFirstMessage ? { topicsExplored: { increment: 1 } } : {}),
          ...(timeGap > 0 ? { timeSpentMinutes: { increment: timeGap } } : {}),
          ...(toolIncrement > 0 ? { quizzesGenerated: { increment: toolIncrement } } : {}),
        },
      });

      if (!session.title || session.title === "New Chat") {
        const truncatedTitle =
          content.length > 50 ? content.slice(0, 50) + "..." : content;
        await tx.aIChatSession.update({
          where: { id: sessionId },
          data: { title: truncatedTitle },
        });
      }

      return [userMsg, aiMsg];
    },
  );

  return { userMessage, aiMessage };
};

const sendMessageStream = async (
  sessionId: string,
  content: string,
  userId: string,
  onToken: (token: string) => void,
  onDone: (aiMessage: { id: string; content: string; createdAt: Date }) => void,
  onError: (error: Error) => void,
) => {
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You do not have access to this session.",
    );
  }

  const weekStart = getWeekStart();

  const userMessage = await prisma.aIMessage.create({
    data: {
      sessionId,
      role: "USER",
      content,
    },
  });

  const pastMessages = await prisma.aIMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true, createdAt: true },
  });

  const prevMsg = pastMessages.length >= 1 ? pastMessages[pastMessages.length - 1] : null;
  const timeGap = prevMsg ? elapsedMinutesSince(new Date(prevMsg.createdAt)) : 0;
  const isFirstMessage = pastMessages.length === 0;

  const history = buildHistory(
    pastMessages.filter((m) => m.role !== "USER" || m.content !== content),
  );

  const modelName = ENVVARS.AI_PROVIDER_MODEL;

  await provider.chatStream(history, content, {
    onToken: (token: string) => {
      onToken(token);
    },
    onDone: async (fullContent: string) => {
      const aiMessage = await prisma.aIMessage.create({
        data: {
          sessionId,
          role: "ASSISTANT",
          content: fullContent,
          model: modelName,
        },
      });

      const toolUsage = detectToolUsage(fullContent);
      const toolIncrement = (toolUsage.quizzes ? 1 : 0) + (toolUsage.flashcards ? 1 : 0);

      await prisma.aIStudyStats.upsert({
        where: {
          userId_weekStart: { userId, weekStart },
        },
        create: {
          userId,
          weekStart,
          questionsAsked: 1,
          topicsExplored: isFirstMessage ? 1 : 0,
          timeSpentMinutes: timeGap || 1,
          quizzesGenerated: toolIncrement,
        },
        update: {
          questionsAsked: { increment: 1 },
          ...(isFirstMessage ? { topicsExplored: { increment: 1 } } : {}),
          ...(timeGap > 0 ? { timeSpentMinutes: { increment: timeGap } } : {}),
          ...(toolIncrement > 0 ? { quizzesGenerated: { increment: toolIncrement } } : {}),
        },
      });

      if (!session.title || session.title === "New Chat") {
        const truncatedTitle =
          content.length > 50 ? content.slice(0, 50) + "..." : content;
        await prisma.aIChatSession.update({
          where: { id: sessionId },
          data: { title: truncatedTitle },
        });
      }

      onDone({
        id: aiMessage.id,
        content: aiMessage.content,
        createdAt: aiMessage.createdAt,
      });
    },
    onError: async (error: Error) => {
      onError(error);
    },
  });
};

const getMessages = async (
  sessionId: string,
  userId: string,
  page: number = 1,
  limit: number = 50,
) => {
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You do not have access to this session.",
    );
  }

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.aIMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.aIMessage.count({ where: { sessionId } }),
  ]);

  return {
    data: messages,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const markHelpful = async (
  messageId: string,
  isHelpful: boolean,
  userId: string,
) => {
  const message = await prisma.aIMessage.findUnique({
    where: { id: messageId },
    include: { session: true },
  });

  if (!message) {
    throw new AppError(status.NOT_FOUND, "Message not found.");
  }

  if (message.session.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You do not have access to this message.",
    );
  }

  const updated = await prisma.aIMessage.update({
    where: { id: messageId },
    data: { isHelpful },
  });

  return updated;
};

const getStudyStats = async (userId: string, weekStart?: Date) => {
  const targetWeek = weekStart || getWeekStart();

  const stats = await prisma.aIStudyStats.findUnique({
    where: {
      userId_weekStart: { userId, weekStart: targetWeek },
    },
  });

  return (
    stats || {
      id: null,
      userId,
      weekStart: targetWeek,
      questionsAsked: 0,
      timeSpentMinutes: 0,
      topicsExplored: 0,
      quizzesGenerated: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );
};

const getStudyStatsHistory = async (userId: string, weeks: number = 4) => {
  const stats = await prisma.aIStudyStats.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: weeks,
  });

  return stats;
};

const summarizePdf = async (userId: string, fileUrl: string) => {
  const response = await fetch(fileUrl);
  const text = await response.text();

  const result = await provider.summarizeContent(text);

  const weekStart = getWeekStart();
  await prisma.aIStudyStats
    .upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: {
        userId,
        weekStart,
        questionsAsked: 0,
        topicsExplored: 1,
        timeSpentMinutes: 1,
      },
      update: {
        topicsExplored: { increment: 1 },
        timeSpentMinutes: { increment: 1 },
      },
    })
    .catch(() => {});

  return result;
};

const generateQuiz = async (
  userId: string,
  content: string,
  numQuestions: number = 5,
) => {
  const result = await provider.generateQuiz(content, numQuestions);

  const weekStart = getWeekStart();
  await prisma.aIStudyStats
    .upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: {
        userId,
        weekStart,
        questionsAsked: 0,
        topicsExplored: 0,
        timeSpentMinutes: 0,
        quizzesGenerated: 1,
      },
      update: { quizzesGenerated: { increment: 1 } },
    })
    .catch(() => {});

  return result;
};

const generateFlashcards = async (content: string, numCards: number = 10) => {
  return provider.generateFlashcards(content, numCards);
};

const explainCode = async (code: string, language?: string) => {
  return provider.explainCode(code, language);
};

const uploadAttachment = async (
  sessionId: string,
  userId: string,
  file: Express.Multer.File,
  originalName: string,
) => {
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You do not have access to this session.",
    );
  }

  const result = await uploadService.upload(file, "ai-attachments", "raw");

  const attachment = await prisma.aIAttachment.create({
    data: {
      sessionId,
      fileName: originalName,
      fileUrl: result.url,
      fileType: file.mimetype,
      fileSize: file.size,
    },
  });

  return attachment;
};

export default {
  createSession,
  getSessions,
  getSessionById,
  deleteSession,
  sendMessage,
  sendMessageStream,
  getMessages,
  markHelpful,
  getStudyStats,
  getStudyStatsHistory,
  summarizePdf,
  generateQuiz,
  generateFlashcards,
  explainCode,
  uploadAttachment,
};
