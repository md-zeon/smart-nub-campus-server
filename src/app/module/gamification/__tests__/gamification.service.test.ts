import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    reputationPoint: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    userBadge: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    badge: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    resource: {
      count: vi.fn(),
    },
    discussion: {
      count: vi.fn(),
    },
    question: {
      count: vi.fn(),
    },
    answer: {
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { gamificationService } from "../gamification.service";

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const CONTENT_ID = "content-1";
const REPUTATION_ID = "rep-1";

const mockReputationRecord = {
  id: REPUTATION_ID,
  userId: USER_ID,
  points: 10,
  reason: "Resource uploaded",
  source: "RESOURCE:content-1",
  event: "RESOURCE_UPLOADED",
  createdAt: new Date("2025-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (fns: any) => {
    if (Array.isArray(fns)) {
      return Promise.all(fns);
    }
    return fns(mockPrisma);
  });
  mockPrisma.badge.findMany.mockResolvedValue([]);
  mockPrisma.userBadge.findMany.mockResolvedValue([]);
});

describe("awardPoints", () => {
  it("creates a reputation point record with the event's point value", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue(
      mockReputationRecord as any,
    );

    const result = await gamificationService.awardPoints({
      userId: USER_ID,
      event: "RESOURCE_UPLOADED",
      reason: "Resource uploaded",
      source: "RESOURCE:content-1",
    });

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        points: 10,
        reason: "Resource uploaded",
        source: "RESOURCE:content-1",
        event: "RESOURCE_UPLOADED",
      },
    });
    expect(result).toEqual(mockReputationRecord);
  });

  it("uses explicit points when provided over event default", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue({
      ...mockReputationRecord,
      points: 5,
    } as any);

    await gamificationService.awardPoints({
      userId: USER_ID,
      event: "RESOURCE_UPLOADED",
      points: 5,
      reason: "Custom points",
    });

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ points: 5 }),
      }),
    );
  });

  it("returns null when point value is 0 for non-zero events", async () => {
    const result = await gamificationService.awardPoints({
      userId: USER_ID,
      event: "BADGE_UNLOCKED",
      reason: "Badge unlocked",
    });

    expect(result).toBeNull();
    expect(mockPrisma.reputationPoint.create).not.toHaveBeenCalled();
  });

  it("still allows CONTENT_REMOVED with 0 points", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue({
      ...mockReputationRecord,
      points: 0,
      event: "CONTENT_REMOVED",
    } as any);

    await gamificationService.awardPoints({
      userId: USER_ID,
      event: "CONTENT_REMOVED",
      points: 0,
      reason: "Content removed",
    });

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalled();
  });

  it("still allows ADMIN_ADJUSTMENT with custom points", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue({
      ...mockReputationRecord,
      points: 50,
      event: "ADMIN_ADJUSTMENT",
    } as any);

    const result = await gamificationService.awardPoints({
      userId: USER_ID,
      event: "ADMIN_ADJUSTMENT",
      points: 50,
      reason: "Manual adjustment",
      source: "admin",
    });

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("triggers badge evaluation asynchronously", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue(
      mockReputationRecord as any,
    );
    vi.mocked(mockPrisma.reputationPoint.aggregate).mockResolvedValue({
      _sum: { points: 10 },
      _count: 1,
    } as any);
    vi.mocked(mockPrisma.resource.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.discussion.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.question.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.answer.count).mockResolvedValue(0);

    await gamificationService.awardPoints({
      userId: USER_ID,
      event: "RESOURCE_UPLOADED",
      reason: "Resource uploaded",
    });

    expect(mockPrisma.badge.findMany).toHaveBeenCalled();
  });
});

describe("vote farming detection (checkVoteFarming)", () => {
  it("allows voting when reciprocal votes are below threshold", async () => {
    vi.mocked(mockPrisma.reputationPoint.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const result = await gamificationService.checkVoteFarming(
      OTHER_USER_ID,
      USER_ID,
    );

    expect(result).toBeUndefined();
  });

  it("throws when reciprocal votes reach the threshold", async () => {
    vi.mocked(mockPrisma.reputationPoint.count)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(4);

    await expect(
      gamificationService.checkVoteFarming(OTHER_USER_ID, USER_ID),
    ).rejects.toThrow("Vote farming detected");
  });

  it("throws when min of reciprocal votes is >= MAX_RECIPROCAL_VOTES", async () => {
    vi.mocked(mockPrisma.reputationPoint.count)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);

    await expect(
      gamificationService.checkVoteFarming(OTHER_USER_ID, USER_ID),
    ).rejects.toThrow("Vote farming detected");
  });

  it("allows voting when only one direction has votes", async () => {
    vi.mocked(mockPrisma.reputationPoint.count)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0);

    const result = await gamificationService.checkVoteFarming(
      OTHER_USER_ID,
      USER_ID,
    );

    expect(result).toBeUndefined();
  });
});

describe("handleUpvote", () => {
  beforeEach(() => {
    vi.mocked(mockPrisma.reputationPoint.count)
      .mockResolvedValue(0)
      .mockResolvedValue(0);
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue(
      mockReputationRecord as any,
    );
  });

  it("awards points to recipient for an upvote on a resource", async () => {
    const result = await gamificationService.handleUpvote(
      OTHER_USER_ID,
      USER_ID,
      "RESOURCE",
      CONTENT_ID,
    );

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          event: "RESOURCE_UPVOTED_received",
          reason: "Upvote received on resource",
          source: `RESOURCE:${CONTENT_ID}`,
        }),
      }),
    );
    expect(result).toEqual(mockReputationRecord);
  });

  it("maps discussion content type correctly", async () => {
    await gamificationService.handleUpvote(
      OTHER_USER_ID,
      USER_ID,
      "DISCUSSION",
      CONTENT_ID,
    );

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: "DISCUSSION_UPVOTED_received",
        }),
      }),
    );
  });

  it("maps question content type correctly", async () => {
    await gamificationService.handleUpvote(
      OTHER_USER_ID,
      USER_ID,
      "QUESTION",
      CONTENT_ID,
    );

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: "QUESTION_UPVOTED_received",
        }),
      }),
    );
  });

  it("maps answer content type correctly", async () => {
    await gamificationService.handleUpvote(
      OTHER_USER_ID,
      USER_ID,
      "ANSWER",
      CONTENT_ID,
    );

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: "ANSWER_UPVOTED_received",
        }),
      }),
    );
  });

  it("prevents self-voting", async () => {
    await expect(
      gamificationService.handleUpvote(USER_ID, USER_ID, "RESOURCE", CONTENT_ID),
    ).rejects.toThrow("You cannot vote on your own content.");
  });

  it("checks for vote farming before awarding points", async () => {
    await gamificationService.handleUpvote(
      OTHER_USER_ID,
      USER_ID,
      "RESOURCE",
      CONTENT_ID,
    );

    expect(mockPrisma.reputationPoint.count).toHaveBeenCalledTimes(2);
  });

  it("throws when vote farming is detected", async () => {
    vi.mocked(mockPrisma.reputationPoint.count)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(5);

    await expect(
      gamificationService.handleUpvote(OTHER_USER_ID, USER_ID, "RESOURCE", CONTENT_ID),
    ).rejects.toThrow("Vote farming detected");
  });
});

describe("handleDownvote", () => {
  beforeEach(() => {
    vi.mocked(mockPrisma.reputationPoint.count)
      .mockResolvedValue(0)
      .mockResolvedValue(0);
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue(
      mockReputationRecord as any,
    );
  });

  it("deducts points from recipient for a downvote", async () => {
    await gamificationService.handleDownvote(
      OTHER_USER_ID,
      USER_ID,
      "RESOURCE",
      CONTENT_ID,
    );

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          event: "RESOURCE_DOWNVOTED_received",
          reason: "Downvote received on resource",
        }),
      }),
    );
  });

  it("also deducts points from the voter", async () => {
    await gamificationService.handleDownvote(
      OTHER_USER_ID,
      USER_ID,
      "RESOURCE",
      CONTENT_ID,
    );

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledTimes(2);

    const voterCall = vi.mocked(mockPrisma.reputationPoint.create).mock
      .calls[1][0];
    expect(voterCall.data.userId).toBe(OTHER_USER_ID);
    expect(voterCall.data.event).toBe("RESOURCE_DOWNVOTED_given");
    expect(voterCall.data.reason).toBe("Downvote given on resource");
  });

  it("prevents self-voting", async () => {
    await expect(
      gamificationService.handleDownvote(
        USER_ID,
        USER_ID,
        "RESOURCE",
        CONTENT_ID,
      ),
    ).rejects.toThrow("You cannot vote on your own content.");
  });

  it("maps discussion content type correctly for recipient", async () => {
    await gamificationService.handleDownvote(
      OTHER_USER_ID,
      USER_ID,
      "DISCUSSION",
      CONTENT_ID,
    );

    const recipientCall = vi.mocked(mockPrisma.reputationPoint.create).mock
      .calls[0][0];
    expect(recipientCall.data.event).toBe("DISCUSSION_DOWNVOTED_received");
  });

  it("checks for vote farming before awarding points", async () => {
    await gamificationService.handleDownvote(
      OTHER_USER_ID,
      USER_ID,
      "RESOURCE",
      CONTENT_ID,
    );

    expect(mockPrisma.reputationPoint.count).toHaveBeenCalledTimes(2);
  });

  it("returns success object", async () => {
    const result = await gamificationService.handleDownvote(
      OTHER_USER_ID,
      USER_ID,
      "RESOURCE",
      CONTENT_ID,
    );

    expect(result).toEqual({ success: true });
  });
});

describe("handleVoteReversal", () => {
  it("creates a reversal record when original record exists", async () => {
    const originalRecord = {
      id: "orig-1",
      userId: USER_ID,
      points: 2,
      event: "RESOURCE_UPVOTED_received",
      source: `RESOURCE:${CONTENT_ID}`,
      createdAt: new Date("2025-01-01"),
    };
    vi.mocked(mockPrisma.reputationPoint.findFirst).mockResolvedValue(
      originalRecord as any,
    );
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue({
      ...originalRecord,
      id: "rev-1",
      points: -2,
      event: "VOTE_REVERSAL",
    } as any);

    const result = await gamificationService.handleVoteReversal(
      OTHER_USER_ID,
      USER_ID,
      "RESOURCE",
      CONTENT_ID,
      "UP",
    );

    expect(mockPrisma.reputationPoint.findFirst).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        source: `RESOURCE:${CONTENT_ID}`,
        event: "RESOURCE_UPVOTED_received",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          event: "VOTE_REVERSAL",
          points: -2,
        }),
      }),
    );
    expect(result).toBeDefined();
  });

  it("returns null when no original record is found", async () => {
    vi.mocked(mockPrisma.reputationPoint.findFirst).mockResolvedValue(null);

    const result = await gamificationService.handleVoteReversal(
      OTHER_USER_ID,
      USER_ID,
      "RESOURCE",
      CONTENT_ID,
      "UP",
    );

    expect(result).toBeNull();
    expect(mockPrisma.reputationPoint.create).not.toHaveBeenCalled();
  });

  it("handles downvote reversal correctly", async () => {
    vi.mocked(mockPrisma.reputationPoint.findFirst).mockResolvedValue({
      id: "orig-1",
      userId: USER_ID,
      points: -1,
      event: "RESOURCE_DOWNVOTED_received",
    } as any);
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue({
      id: "rev-1",
      userId: USER_ID,
      points: 1,
      event: "VOTE_REVERSAL",
    } as any);

    await gamificationService.handleVoteReversal(
      OTHER_USER_ID,
      USER_ID,
      "RESOURCE",
      CONTENT_ID,
      "DOWN",
    );

    expect(mockPrisma.reputationPoint.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: "RESOURCE_DOWNVOTED_received",
        }),
      }),
    );

    const createCall = vi.mocked(mockPrisma.reputationPoint.create).mock
      .calls[0][0];
    expect(createCall.data.points).toBe(1);
  });
});

describe("handleContentDeleted", () => {
  it("reverses all positive point records for the content", async () => {
    const records = [
      { id: "r1", points: 10, event: "RESOURCE_UPLOADED" },
      { id: "r2", points: 2, event: "RESOURCE_UPVOTED_received" },
    ];
    vi.mocked(mockPrisma.reputationPoint.findMany).mockResolvedValue(
      records as any,
    );
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue(
      mockReputationRecord as any,
    );

    const result = await gamificationService.handleContentDeleted(
      "RESOURCE",
      CONTENT_ID,
      USER_ID,
    );

    expect(mockPrisma.reputationPoint.findMany).toHaveBeenCalledWith({
      where: { source: `RESOURCE:${CONTENT_ID}`, userId: USER_ID },
    });

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledTimes(2);

    expect(result).toEqual({ totalReversed: 12 });
  });

  it("does not reverse negative point records", async () => {
    const records = [
      { id: "r1", points: -1, event: "RESOURCE_DOWNVOTED_received" },
    ];
    vi.mocked(mockPrisma.reputationPoint.findMany).mockResolvedValue(
      records as any,
    );

    const result = await gamificationService.handleContentDeleted(
      "RESOURCE",
      CONTENT_ID,
      USER_ID,
    );

    expect(mockPrisma.reputationPoint.create).not.toHaveBeenCalled();
    expect(result).toEqual({ totalReversed: 0 });
  });

  it("returns totalReversed 0 when no records exist", async () => {
    vi.mocked(mockPrisma.reputationPoint.findMany).mockResolvedValue([]);

    const result = await gamificationService.handleContentDeleted(
      "RESOURCE",
      CONTENT_ID,
      USER_ID,
    );

    expect(result).toEqual({ totalReversed: 0 });
  });
});

describe("getLeaderboard", () => {
  const mockUser1 = {
    id: USER_ID,
    name: "Alice",
    image: "alice.png",
  };
  const mockUser2 = {
    id: OTHER_USER_ID,
    name: "Bob",
    image: "bob.png",
  };

  it("returns paginated leaderboard with user details", async () => {
    vi.mocked(mockPrisma.reputationPoint.groupBy)
      .mockResolvedValueOnce([
        { userId: USER_ID, _sum: { points: 100 } },
        { userId: OTHER_USER_ID, _sum: { points: 50 } },
      ] as any)
      .mockResolvedValueOnce([
        { userId: USER_ID },
        { userId: OTHER_USER_ID },
      ] as any);
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([
      mockUser1,
      mockUser2,
    ] as any);

    const result = await gamificationService.getLeaderboard({
      page: 1,
      limit: 10,
    });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      rank: 1,
      user: mockUser1,
      totalPoints: 100,
    });
    expect(result.data[1]).toEqual({
      rank: 2,
      user: mockUser2,
      totalPoints: 50,
    });
    expect(result.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 10, total: 2 }),
    );
  });

  it("filters out users not found in user table", async () => {
    vi.mocked(mockPrisma.reputationPoint.groupBy)
      .mockResolvedValueOnce([
        { userId: USER_ID, _sum: { points: 100 } },
        { userId: "deleted-user", _sum: { points: 50 } },
      ] as any)
      .mockResolvedValueOnce([
        { userId: USER_ID },
        { userId: "deleted-user" },
      ] as any);
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([mockUser1] as any);

    const result = await gamificationService.getLeaderboard({});

    expect(result.data).toHaveLength(1);
    expect(result.data[0].user).toEqual(mockUser1);
  });

  it("floors negative totals to 0", async () => {
    vi.mocked(mockPrisma.reputationPoint.groupBy)
      .mockResolvedValueOnce([
        { userId: USER_ID, _sum: { points: -5 } },
      ] as any)
      .mockResolvedValueOnce([{ userId: USER_ID }] as any);
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([mockUser1] as any);

    const result = await gamificationService.getLeaderboard({});

    expect(result.data[0].totalPoints).toBe(0);
  });

  it("handles null sum by defaulting to 0", async () => {
    vi.mocked(mockPrisma.reputationPoint.groupBy)
      .mockResolvedValueOnce([
        { userId: USER_ID, _sum: { points: null } },
      ] as any)
      .mockResolvedValueOnce([{ userId: USER_ID }] as any);
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([mockUser1] as any);

    const result = await gamificationService.getLeaderboard({});

    expect(result.data[0].totalPoints).toBe(0);
  });

  it("returns empty leaderboard when no users have points", async () => {
    vi.mocked(mockPrisma.reputationPoint.groupBy)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([]);

    const result = await gamificationService.getLeaderboard({});

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it("uses default page 1 and limit 10", async () => {
    vi.mocked(mockPrisma.reputationPoint.groupBy)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([]);

    await gamificationService.getLeaderboard({});

    const firstGroupByCall = vi.mocked(mockPrisma.reputationPoint.groupBy).mock
      .calls[0][0];
    expect(firstGroupByCall.skip).toBe(0);
    expect(firstGroupByCall.take).toBe(10);
  });

  it("calculates correct skip for page 2", async () => {
    vi.mocked(mockPrisma.reputationPoint.groupBy)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.mocked(mockPrisma.user.findMany).mockResolvedValue([]);

    await gamificationService.getLeaderboard({ page: 2, limit: 5 });

    const firstGroupByCall = vi.mocked(mockPrisma.reputationPoint.groupBy).mock
      .calls[0][0];
    expect(firstGroupByCall.skip).toBe(5);
    expect(firstGroupByCall.take).toBe(5);
  });
});

describe("getUserPoints", () => {
  it("returns total points and event count", async () => {
    vi.mocked(mockPrisma.reputationPoint.aggregate).mockResolvedValue({
      _sum: { points: 42 },
      _count: 15,
    } as any);

    const result = await gamificationService.getUserPoints(USER_ID);

    expect(result).toEqual({ totalPoints: 42, totalEvents: 15 });
    expect(mockPrisma.reputationPoint.aggregate).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      _sum: { points: true },
      _count: true,
    });
  });

  it("floors negative totals to 0", async () => {
    vi.mocked(mockPrisma.reputationPoint.aggregate).mockResolvedValue({
      _sum: { points: -10 },
      _count: 5,
    } as any);

    const result = await gamificationService.getUserPoints(USER_ID);

    expect(result.totalPoints).toBe(0);
  });

  it("handles null sum by defaulting to 0", async () => {
    vi.mocked(mockPrisma.reputationPoint.aggregate).mockResolvedValue({
      _sum: { points: null },
      _count: 0,
    } as any);

    const result = await gamificationService.getUserPoints(USER_ID);

    expect(result.totalPoints).toBe(0);
    expect(result.totalEvents).toBe(0);
  });
});

describe("adminAdjustPoints", () => {
  it("creates an admin adjustment record", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue({
      ...mockReputationRecord,
      event: "ADMIN_ADJUSTMENT",
      points: 50,
      source: "admin",
    } as any);

    const result = await gamificationService.adminAdjustPoints({
      userId: USER_ID,
      points: 50,
      reason: "Manual bonus",
    });

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          event: "ADMIN_ADJUSTMENT",
          points: 50,
          reason: "Manual bonus",
          source: "admin",
        }),
      }),
    );
    expect(result).toBeDefined();
  });

  it("supports negative adjustments for point deductions", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue({
      ...mockReputationRecord,
      event: "ADMIN_ADJUSTMENT",
      points: -25,
      source: "admin",
    } as any);

    await gamificationService.adminAdjustPoints({
      userId: USER_ID,
      points: -25,
      reason: "Penalty",
    });

    const createCall = vi.mocked(mockPrisma.reputationPoint.create).mock
      .calls[0][0];
    expect(createCall.data.points).toBe(-25);
  });
});

describe("reversePoints", () => {
  it("creates a reversal record with CONTENT_REMOVED event", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue({
      ...mockReputationRecord,
      points: 0,
      event: "CONTENT_REMOVED",
    } as any);

    const result = await gamificationService.reversePoints(
      USER_ID,
      "RESOURCE_UPLOADED",
      "Content removed",
      "RESOURCE:content-1",
    );

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        points: 0,
        reason: "Content removed",
        source: "RESOURCE:content-1",
        event: "CONTENT_REMOVED",
      },
    });
    expect(result).toBeDefined();
  });

  it("defaults source to null when not provided", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue(
      mockReputationRecord as any,
    );

    await gamificationService.reversePoints(USER_ID, "EVENT", "reason");

    expect(mockPrisma.reputationPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: null }),
      }),
    );
  });
});

describe("checkSelfVoting", () => {
  it("returns true when voter is the content owner", async () => {
    const result = await gamificationService.checkSelfVoting(
      USER_ID,
      USER_ID,
    );
    expect(result).toBe(true);
  });

  it("returns false when voter is different from content owner", async () => {
    const result = await gamificationService.checkSelfVoting(
      OTHER_USER_ID,
      USER_ID,
    );
    expect(result).toBe(false);
  });
});

describe("evaluateBadges (via awardPoints)", () => {
  it("awards badge when condition is met", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue(
      mockReputationRecord as any,
    );

    const mockBadge = {
      id: "badge-1",
      name: "First Upload",
      description: "Upload your first resource",
      condition: "resources_uploaded:1",
      points: 5,
    };
    vi.mocked(mockPrisma.badge.findMany).mockResolvedValue([mockBadge] as any);
    vi.mocked(mockPrisma.userBadge.findMany).mockResolvedValue([]);
    vi.mocked(mockPrisma.resource.count).mockResolvedValue(1);
    vi.mocked(mockPrisma.discussion.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.question.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.answer.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.reputationPoint.aggregate).mockResolvedValue({
      _sum: { points: 10 },
      _count: 1,
    } as any);

    await gamificationService.awardPoints({
      userId: USER_ID,
      event: "RESOURCE_UPLOADED",
      reason: "Resource uploaded",
    });

    await vi.waitFor(() => {
      expect(mockPrisma.userBadge.create).toHaveBeenCalledWith({
        data: { userId: USER_ID, badgeId: "badge-1" },
      });
    });
  });

  it("skips badges already unlocked by user", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue(
      mockReputationRecord as any,
    );

    const mockBadge = {
      id: "badge-1",
      name: "First Upload",
      description: "Upload your first resource",
      condition: "resources_uploaded:1",
      points: 5,
    };
    vi.mocked(mockPrisma.badge.findMany).mockResolvedValue([mockBadge] as any);
    vi.mocked(mockPrisma.userBadge.findMany).mockResolvedValue([
      { badgeId: "badge-1" },
    ] as any);

    await gamificationService.awardPoints({
      userId: USER_ID,
      event: "RESOURCE_UPLOADED",
      reason: "Resource uploaded",
    });

    await vi.waitFor(() => {
      expect(mockPrisma.userBadge.create).not.toHaveBeenCalled();
    });
  });

  it("does not award badge when condition is not met", async () => {
    vi.mocked(mockPrisma.reputationPoint.create).mockResolvedValue(
      mockReputationRecord as any,
    );

    const mockBadge = {
      id: "badge-1",
      name: "Power Uploader",
      description: "Upload 10 resources",
      condition: "resources_uploaded:10",
      points: 20,
    };
    vi.mocked(mockPrisma.badge.findMany).mockResolvedValue([mockBadge] as any);
    vi.mocked(mockPrisma.userBadge.findMany).mockResolvedValue([]);
    vi.mocked(mockPrisma.resource.count).mockResolvedValue(3);
    vi.mocked(mockPrisma.discussion.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.question.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.answer.count).mockResolvedValue(0);
    vi.mocked(mockPrisma.reputationPoint.aggregate).mockResolvedValue({
      _sum: { points: 10 },
      _count: 1,
    } as any);

    await gamificationService.awardPoints({
      userId: USER_ID,
      event: "RESOURCE_UPLOADED",
      reason: "Resource uploaded",
    });

    await vi.waitFor(() => {
      expect(mockPrisma.userBadge.create).not.toHaveBeenCalled();
    });
  });
});
