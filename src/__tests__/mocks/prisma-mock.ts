import { vi } from "vitest";

type MockFn = ReturnType<typeof vi.fn>;

const createMockModel = (): Record<string, MockFn> => {
  return new Proxy({} as Record<string, MockFn>, {
    get(_target, _prop) {
      return vi.fn();
    },
  });
};

const MODELS = [
  "user", "session", "account", "verification", "student", "admin",
  "resource", "resourceTag", "resourceVote", "resourceBookmark",
  "resourceDownload", "resourceReport", "resourceCategory",
  "course", "tag", "comment",
  "discussion", "discussionTag", "discussionVote", "discussionReply",
  "discussionReplyVote", "discussionBookmark", "discussionCategory",
  "question", "questionTag", "questionVote", "questionBookmark",
  "questionCategory", "answer", "answerVote",
  "event", "eventRSVP", "connection", "conversation",
  "conversationParticipant", "message", "notification",
  "reputationPoint", "userBadge", "badge", "userProfile",
  "userSkill", "teamMember", "teamRequest", "teamApplication",
  "teamRequestSkill", "blockedUser", "auditLog", "onboardingStep",
  "verificationRequest", "aiChatSession", "aiMessage", "aiStudyStats",
] as const;

export const createMockPrisma = (): any => {
  const prisma: Record<string, any> = {};

  for (const model of MODELS) {
    prisma[model] = createMockModel();
  }

  prisma.$transaction = vi.fn(async (fns: any) => {
    if (Array.isArray(fns)) {
      return Promise.all(fns);
    }
    if (typeof fns === "function") {
      return fns(prisma);
    }
    return [];
  });

  prisma.$connect = vi.fn();
  prisma.$disconnect = vi.fn();

  return prisma;
};
