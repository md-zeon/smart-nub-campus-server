import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";

/**
 * Calculate the Monday of the current week (or a given date's week).
 * Used for weekly study stats tracking.
 */
const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Mock AI response generator.
 * Returns a structured response identical to what a real LLM provider would return.
 * In production, this would be replaced with actual LLM API calls.
 */
const generateMockAIResponse = (userMessage: string): string => {
  const responses = [
    `Great question! Based on your query about "${userMessage.slice(0, 50)}${userMessage.length > 50 ? "..." : ""}", here's what I can help with:\n\nI'm currently in MVP mode with simulated responses. In the future, I'll be powered by a real LLM to provide detailed, contextual answers to your academic questions.\n\nFor now, I recommend:\n1. Checking the Resources section for relevant materials\n2. Posting in Discussions for community help\n3. Using Q&A for specific academic questions`,
    `Thanks for your message! I understand you're asking about: "${userMessage.slice(0, 50)}${userMessage.length > 50 ? "..." : ""}"\n\nAs an AI assistant in development, I'm designed to help with:\n- Explaining complex concepts\n- Summarizing study materials\n- Generating practice quizzes\n- Breaking down code snippets\n\nThis feature will be fully functional soon with real AI capabilities.`,
    `I received your question! Here's my simulated response:\n\n"${userMessage.slice(0, 100)}${userMessage.length > 100 ? "..." : ""}"\n\nIn the production version, I'll analyze your query and provide comprehensive, accurate answers using advanced language models. Stay tuned for the full AI-powered experience!`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};

/**
 * Create a new AI chat session for a user.
 */
const createSession = async (userId: string, title?: string) => {
  const session = await prisma.aIChatSession.create({
    data: {
      userId,
      title: title || "New Chat",
    },
  });
  return session;
};

/**
 * Get sessions for a user with pagination, ordered by most recent.
 */
const getSessions = async (userId: string, page: number = 1, limit: number = 20) => {
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

/**
 * Get a single session by ID, verifying ownership.
 */
const getSessionById = async (sessionId: string, userId: string) => {
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
    include: { aiMessages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You do not have access to this session.");
  }

  return session;
};

/**
 * Delete a session and its messages (hard delete via cascade).
 */
const deleteSession = async (sessionId: string, userId: string) => {
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You do not have access to this session.");
  }

  await prisma.aIChatSession.delete({ where: { id: sessionId } });
};

/**
 * Send a user message, generate a mock AI response, and update study stats.
 * Uses a transaction to ensure atomicity.
 */
const sendMessage = async (sessionId: string, content: string, userId: string) => {
  // Verify session exists and belongs to user
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You do not have access to this session.");
  }

  // Generate mock AI response
  const aiResponseContent = generateMockAIResponse(content);
  const weekStart = getWeekStart();

  // Create user message, AI response, and update stats in a transaction
  const [userMessage, aiMessage] = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create user message
    const userMsg = await tx.aIMessage.create({
      data: {
        sessionId,
        role: "USER",
        content,
      },
    });

    // Create AI response
    const aiMsg = await tx.aIMessage.create({
      data: {
        sessionId,
        role: "ASSISTANT",
        content: aiResponseContent,
      },
    });

    // Upsert weekly study stats (create or increment)
    await tx.aIStudyStats.upsert({
      where: {
        userId_weekStart: { userId, weekStart },
      },
      create: {
        userId,
        weekStart,
        questionsAsked: 1,
        topicsExplored: 1,
        timeSpentMinutes: 1,
      },
      update: {
        questionsAsked: { increment: 1 },
        topicsExplored: { increment: 1 },
        timeSpentMinutes: { increment: 1 },
      },
    });

    // Update session title if it's the first message
    if (!session.title || session.title === "New Chat") {
      const truncatedTitle = content.length > 50 ? content.slice(0, 50) + "..." : content;
      await tx.aIChatSession.update({
        where: { id: sessionId },
        data: { title: truncatedTitle },
      });
    }

    return [userMsg, aiMsg];
  });

  return { userMessage, aiMessage };
};

/**
 * Get all messages in a session, paginated.
 */
const getMessages = async (
  sessionId: string,
  userId: string,
  page: number = 1,
  limit: number = 50,
) => {
  // Verify session access
  const session = await prisma.aIChatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new AppError(status.NOT_FOUND, "Chat session not found.");
  }

  if (session.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You do not have access to this session.");
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

/**
 * Mark a message as helpful or unhelpful.
 */
const markHelpful = async (messageId: string, isHelpful: boolean, userId: string) => {
  const message = await prisma.aIMessage.findUnique({
    where: { id: messageId },
    include: { session: true },
  });

  if (!message) {
    throw new AppError(status.NOT_FOUND, "Message not found.");
  }

  if (message.session.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You do not have access to this message.");
  }

  const updated = await prisma.aIMessage.update({
    where: { id: messageId },
    data: { isHelpful },
  });

  return updated;
};

/**
 * Get study stats for a user for a given week (defaults to current week).
 */
const getStudyStats = async (userId: string, weekStart?: Date) => {
  const targetWeek = weekStart || getWeekStart();

  const stats = await prisma.aIStudyStats.findUnique({
    where: {
      userId_weekStart: { userId, weekStart: targetWeek },
    },
  });

  return stats || {
    id: null,
    userId,
    weekStart: targetWeek,
    questionsAsked: 0,
    timeSpentMinutes: 0,
    topicsExplored: 0,
    quizzesGenerated: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get study stats for a user over multiple weeks.
 */
const getStudyStatsHistory = async (userId: string, weeks: number = 4) => {
  const stats = await prisma.aIStudyStats.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: weeks,
  });

  return stats;
};

// --- Placeholder tool implementations ---

/**
 * Placeholder: PDF summarization endpoint.
 * Returns a structured stub for future LLM integration.
 */
const summarizePdf = async (fileUrl: string) => {
  return {
    status: "placeholder",
    message: "PDF summarization will be available soon. This endpoint is structured for future LLM integration.",
    data: {
      fileUrl,
      summary: "This is a placeholder summary. In production, this would contain an AI-generated summary of the PDF content.",
      keyPoints: [
        "Placeholder key point 1",
        "Placeholder key point 2",
        "Placeholder key point 3",
      ],
    },
  };
};

/**
 * Placeholder: Quiz generation endpoint.
 * Returns a structured stub for future LLM integration.
 */
const generateQuiz = async (userId: string, content: string, numQuestions: number = 5) => {
  const placeholderQuestions = Array.from({ length: numQuestions }, (_, i) => ({
    question: `Placeholder question ${i + 1} based on the provided content`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer: "Option A",
  }));

  const weekStart = getWeekStart();

  // Increment quizzesGenerated stat
  await prisma.aIStudyStats.upsert({
    where: {
      userId_weekStart: { userId, weekStart },
    },
    create: {
      userId,
      weekStart,
      questionsAsked: 0,
      topicsExplored: 0,
      timeSpentMinutes: 0,
      quizzesGenerated: 1,
    },
    update: {
      quizzesGenerated: { increment: 1 },
    },
  }).catch(() => {
    // Silently fail — stats update is non-critical
  });

  return {
    status: "placeholder",
    message: "Quiz generation will be available soon. This endpoint is structured for future LLM integration.",
    data: {
      questions: placeholderQuestions,
      totalQuestions: numQuestions,
    },
  };
};

/**
 * Placeholder: Flashcard generation endpoint.
 * Returns a structured stub for future LLM integration.
 */
const generateFlashcards = async (content: string, numCards: number = 10) => {
  const placeholderCards = Array.from({ length: numCards }, (_, i) => ({
    front: `Placeholder front ${i + 1}`,
    back: `Placeholder back ${i + 1}`,
  }));

  return {
    status: "placeholder",
    message: "Flashcard generation will be available soon. This endpoint is structured for future LLM integration.",
    data: {
      cards: placeholderCards,
      totalCards: numCards,
    },
  };
};

/**
 * Placeholder: Code explanation endpoint.
 * Returns a structured stub for future LLM integration.
 */
const explainCode = async (code: string, language?: string) => {
  return {
    status: "placeholder",
    message: "Code explanation will be available soon. This endpoint is structured for future LLM integration.",
    data: {
      language: language || "auto-detected",
      explanation: "This is a placeholder explanation. In production, this would contain a detailed AI-generated explanation of the code.",
      complexity: "placeholder",
      suggestions: ["Placeholder suggestion 1", "Placeholder suggestion 2"],
    },
  };
};

export default {
  createSession,
  getSessions,
  getSessionById,
  deleteSession,
  sendMessage,
  getMessages,
  markHelpful,
  getStudyStats,
  getStudyStatsHistory,
  summarizePdf,
  generateQuiz,
  generateFlashcards,
  explainCode,
};
