import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    connection: {
      groupBy: vi.fn(),
    },
    mentorshipRequest: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    mentorship: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    mentorshipGoal: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      aggregate: vi.fn(),
    },
    mentorshipSession: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    mentorshipMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fns: unknown) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      return (fns as (tx: unknown) => unknown)({});
    }),
  },
}));

import { prisma } from "../../../../app/lib/prisma";
import { mentorshipService } from "../mentorship.service";

const mockPrisma = vi.mocked(prisma);

const mentorId = "user-mentor";
const menteeId = "user-mentee";
const outsiderId = "user-outsider";

const mentor = {
  id: mentorId,
  name: "Alice",
  image: null,
  profile: {
    jobTitle: "Engineer",
    currentEmployer: "Tech Co",
    industry: "IT",
    mentorshipTopics: ["Career", "Interview"],
    batchYear: 2022,
    location: "Dhaka",
  },
  student: {
    department: "CSE",
    graduationYear: 2022,
    degreeTitle: "BSc in CSE",
  },
};

// Exposes the transaction proxy created by the $transaction mock so tests can
// assert on the tx-level calls the service makes when accepting a request.
let txMock: {
  mentorshipRequest: { update: ReturnType<typeof vi.fn> };
  mentorship: { create: ReturnType<typeof vi.fn> };
} | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  txMock = null;
  mockPrisma.$transaction.mockImplementation(async (fns: unknown) => {
    if (Array.isArray(fns)) {
      return Promise.all(fns);
    }
    const tx = {
      mentorshipRequest: {
        update: vi.fn(async (args: { data: { status: string } }) => ({
          id: "req-1",
          status: args?.data?.status ?? "ACCEPTED",
        })),
      },
      mentorship: { create: vi.fn().mockResolvedValue({}) },
    };
    txMock = tx;
    return (fns as (t: unknown) => unknown)(tx);
  });
  mockPrisma.mentorship.groupBy.mockResolvedValue([] as never);
  mockPrisma.mentorshipRequest.groupBy.mockResolvedValue([] as never);
  mockPrisma.mentorship.findMany.mockResolvedValue([] as never);
  mockPrisma.mentorshipRequest.findMany.mockResolvedValue([] as never);
});

// ─── listMentors ────────────────────────────────────────────────────

describe("listMentors", () => {
  it("only returns active alumni who opted in as mentors", async () => {
    mockPrisma.$transaction.mockResolvedValue([[mentor], 1] as never);
    mockPrisma.connection.groupBy.mockResolvedValue([] as never);

    const result = await mentorshipService.listMentors({});

    expect(result.data[0].id).toBe(mentorId);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "ALUMNI",
          status: "ACTIVE",
          isDeleted: false,
          profile: { is: { isMentor: true } },
        }),
      }),
    );
  });

  it("filters by topic via mentorshipTopics has", async () => {
    mockPrisma.$transaction.mockResolvedValue([[mentor], 1] as never);
    mockPrisma.connection.groupBy.mockResolvedValue([] as never);

    await mentorshipService.listMentors({ topic: "Interview" });

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          profile: {
            is: { isMentor: true, mentorshipTopics: { has: "Interview" } },
          },
        }),
      }),
    );
  });

  it("filters by department via student relation", async () => {
    mockPrisma.$transaction.mockResolvedValue([[mentor], 1] as never);
    mockPrisma.connection.groupBy.mockResolvedValue([] as never);

    await mentorshipService.listMentors({ department: "CSE" });

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          student: { is: { department: "CSE" } },
        }),
      }),
    );
  });

  it("attaches connection counts from the groupBy result", async () => {
    mockPrisma.$transaction.mockResolvedValue([[mentor], 1] as never);
    mockPrisma.connection.groupBy.mockResolvedValue([
      { receiverId: mentorId, _count: 7 },
    ] as never);

    const result = await mentorshipService.listMentors({});

    expect(result.data[0].stats.connectionCount).toBe(7);
  });

  it("ranks same-department mentors higher on relevance sort", async () => {
    const otherMentor = {
      ...mentor,
      id: "user-mentor-2",
      name: "Zed",
      student: { department: "BBA", graduationYear: 2021, degreeTitle: "BBA" },
    };
    mockPrisma.$transaction.mockResolvedValue([[mentor, otherMentor], 2] as never);
    mockPrisma.connection.groupBy.mockResolvedValue([] as never);
    mockPrisma.user.findUnique.mockResolvedValue({
      student: { department: "CSE" },
    } as never);

    const result = await mentorshipService.listMentors(
      { sort: "relevance" },
      "viewer-id",
    );

    expect(result.data[0].id).toBe(mentorId);
    expect(result.data[0].matchScore).toBeGreaterThan(result.data[1].matchScore);
    expect(result.data[0].stats.slotsAvailable).toBe(3);
  });

  it("reports a mentor at capacity with zero available slots", async () => {
    mockPrisma.$transaction.mockResolvedValue([[mentor], 1] as never);
    mockPrisma.connection.groupBy.mockResolvedValue([] as never);
    mockPrisma.mentorship.groupBy
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ mentorId, _count: 3 }] as never);

    const result = await mentorshipService.listMentors({});

    expect(result.data[0].stats.committedSlots).toBe(3);
    expect(result.data[0].stats.slotsAvailable).toBe(0);
  });

  it("reports the viewer's relationship with each mentor", async () => {
    const otherMentor = {
      ...mentor,
      id: "user-mentor-2",
      name: "Zed",
    };
    mockPrisma.$transaction.mockResolvedValue([[mentor, otherMentor], 2] as never);
    mockPrisma.connection.groupBy.mockResolvedValue([] as never);
    mockPrisma.user.findUnique.mockResolvedValue({
      student: { department: "CSE" },
    } as never);
    mockPrisma.mentorship.findMany.mockResolvedValue([
      { mentorId },
    ] as never);
    mockPrisma.mentorshipRequest.findMany.mockResolvedValue([
      { mentorId: "user-mentor-2" },
    ] as never);

    const result = await mentorshipService.listMentors({}, "viewer-id");

    const alice = result.data.find((m) => m.id === mentorId);
    const zed = result.data.find((m) => m.id === "user-mentor-2");
    expect(alice?.relationshipState).toBe("active");
    expect(zed?.relationshipState).toBe("pending");
  });

  it("marks the viewer's own card as self", async () => {
    mockPrisma.$transaction.mockResolvedValue([[mentor], 1] as never);
    mockPrisma.connection.groupBy.mockResolvedValue([] as never);

    const result = await mentorshipService.listMentors({}, mentorId);

    expect(result.data[0].relationshipState).toBe("self");
  });
});

// ─── createMentorshipRequest ────────────────────────────────────────

describe("createMentorshipRequest", () => {
  it("rejects requesting yourself as a mentor", async () => {
    await expect(
      mentorshipService.createMentorshipRequest(menteeId, {
        mentorId: menteeId,
        goals: ["Career"],
      }),
    ).rejects.toThrow("You cannot request mentorship from yourself.");
  });

  it("throws NOT_FOUND when the mentor is not an opted-in active alumni", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      mentorshipService.createMentorshipRequest(menteeId, {
        mentorId: mentorId,
        goals: ["Career"],
      }),
    ).rejects.toThrow("Mentor not found.");
  });

  it("blocks duplicate active requests", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: mentorId,
      name: "Alice",
    } as never);
    mockPrisma.mentorshipRequest.findFirst.mockResolvedValue({
      id: "req-1",
    } as never);

    await expect(
      mentorshipService.createMentorshipRequest(menteeId, {
        mentorId,
        goals: ["Career"],
      }),
    ).rejects.toThrow(
      "You already have an active mentorship request with this mentor.",
    );
  });

  it("blocks requests when the mentor is at full capacity", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: mentorId,
      name: "Alice",
      profile: { mentorMaxMentees: 2 },
    } as never);
    mockPrisma.mentorshipRequest.findFirst.mockResolvedValue(null);
    mockPrisma.mentorship.groupBy.mockResolvedValue([
      { mentorId, _count: 2 },
    ] as never);

    await expect(
      mentorshipService.createMentorshipRequest(menteeId, {
        mentorId,
        goals: ["Career"],
      }),
    ).rejects.toThrow(/full capacity/);
  });

  it("creates a request with goals and notifies the mentor", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: mentorId,
      name: "Alice",
      profile: { mentorMaxMentees: 3 },
    } as never);
    mockPrisma.mentorshipRequest.findFirst.mockResolvedValue(null);
    mockPrisma.mentorshipRequest.create.mockResolvedValue({
      id: "req-1",
      mentee: { id: menteeId, name: "Bob", image: null },
    } as never);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await mentorshipService.createMentorshipRequest(menteeId, {
      mentorId,
      topic: "Career advice",
      message: "Would love your guidance.",
      goals: ["Build a resume", "Interview prep"],
    });

    expect(result.id).toBe("req-1");
    expect(mockPrisma.mentorshipRequest.create).toHaveBeenCalledWith({
      data: {
        mentorId,
        menteeId,
        topic: "Career advice",
        message: "Would love your guidance.",
        goals: ["Build a resume", "Interview prep"],
      },
      include: expect.any(Object),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mentorId,
          senderId: menteeId,
          type: "MENTORSHIP_REQUEST_RECEIVED",
        }),
      }),
    );
  });
});

// ─── updateMentorshipRequest ────────────────────────────────────────

describe("updateMentorshipRequest", () => {
  const pendingRequest = {
    id: "req-1",
    mentorId,
    menteeId,
    status: "PENDING",
    goals: ["Career switch"],
    mentor: { name: "Alice" },
    mentee: { name: "Bob" },
  };

  it("forbids users who are not involved in the request", async () => {
    mockPrisma.mentorshipRequest.findUnique.mockResolvedValue(
      pendingRequest as never,
    );

    await expect(
      mentorshipService.updateMentorshipRequest(outsiderId, "req-1", {
        status: "ACCEPTED",
      }),
    ).rejects.toThrow("You are not involved in this mentorship request.");
  });

  it("rejects updates after the request has been responded to", async () => {
    mockPrisma.mentorshipRequest.findUnique.mockResolvedValue({
      ...pendingRequest,
      status: "ACCEPTED",
    } as never);

    await expect(
      mentorshipService.updateMentorshipRequest(mentorId, "req-1", {
        status: "REJECTED",
      }),
    ).rejects.toThrow("This mentorship request has already been responded to.");
  });

  it("restricts mentees to withdrawing only", async () => {
    mockPrisma.mentorshipRequest.findUnique.mockResolvedValue(
      pendingRequest as never,
    );

    await expect(
      mentorshipService.updateMentorshipRequest(menteeId, "req-1", {
        status: "ACCEPTED",
      }),
    ).rejects.toThrow("Mentees can only withdraw a mentorship request.");
  });

  it("prevents mentors from withdrawing a request", async () => {
    mockPrisma.mentorshipRequest.findUnique.mockResolvedValue(
      pendingRequest as never,
    );

    await expect(
      mentorshipService.updateMentorshipRequest(mentorId, "req-1", {
        status: "WITHDRAWN",
      }),
    ).rejects.toThrow(
      "Mentors can accept or reject a request, but not withdraw it.",
    );
  });

  it("creates a Mentorship seeded with request goals when accepting", async () => {
    mockPrisma.mentorshipRequest.findUnique.mockResolvedValue(
      pendingRequest as never,
    );
    mockPrisma.user.findUnique.mockResolvedValue({
      profile: { mentorMaxMentees: 3 },
    } as never);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await mentorshipService.updateMentorshipRequest(
      mentorId,
      "req-1",
      { status: "ACCEPTED" },
    );

    expect(result.status).toBe("ACCEPTED");
    expect(txMock?.mentorshipRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "req-1" },
        data: { status: "ACCEPTED", respondedAt: expect.any(Date) },
      }),
    );
    expect(txMock?.mentorship.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestId: "req-1",
          mentorId,
          menteeId,
        }),
      }),
    );
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: menteeId,
          type: "MENTORSHIP_ACCEPTED",
        }),
      }),
    );
  });

  it("lets a mentee withdraw the request", async () => {
    mockPrisma.mentorshipRequest.findUnique.mockResolvedValue(
      pendingRequest as never,
    );
    mockPrisma.mentorshipRequest.update.mockResolvedValue({
      ...pendingRequest,
      status: "WITHDRAWN",
    } as never);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await mentorshipService.updateMentorshipRequest(
      menteeId,
      "req-1",
      { status: "WITHDRAWN" },
    );

    expect(result.status).toBe("WITHDRAWN");
  });
});

// ─── Relationships ──────────────────────────────────────────────────

describe("listMentorships", () => {
  it("returns relationships where the user is a participant", async () => {
    const mentorship = {
      id: "m-1",
      mentorId,
      menteeId,
      status: "ACTIVE",
      mentor: { id: mentorId, name: "Alice", image: null, profile: null, student: null },
      mentee: { id: menteeId, name: "Bob", image: null, profile: null, student: null },
      request: { topic: null, message: null, goals: [], createdAt: new Date() },
      goals: [],
      sessions: [],
      _count: { messages: 0 },
    };
    mockPrisma.$transaction.mockResolvedValue([[mentorship], 1] as never);

    const result = await mentorshipService.listMentorships(menteeId, {});

    expect(result.data[0].id).toBe("m-1");
    expect(result.data[0].role).toBe("mentee");
    expect(mockPrisma.mentorship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ mentorId: menteeId }, { menteeId: menteeId }],
        }),
      }),
    );
  });
});

describe("getMentorship", () => {
  it("forbids users who are not participants", async () => {
    mockPrisma.mentorship.findUnique.mockResolvedValue({
      id: "m-1",
      mentorId,
      menteeId,
    } as never);

    await expect(
      mentorshipService.getMentorship(outsiderId, "m-1"),
    ).rejects.toThrow("You are not part of this mentorship.");
  });
});

describe("completeMentorship", () => {
  it("stores the mentor's private closing note and ends the relationship", async () => {
    mockPrisma.mentorship.findUnique.mockResolvedValue({
      id: "m-1",
      mentorId,
      menteeId,
      status: "ACTIVE",
    } as never);
    mockPrisma.mentorship.update.mockResolvedValue({
      id: "m-1",
      status: "COMPLETED",
    } as never);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await mentorshipService.completeMentorship(mentorId, "m-1", {
      feedback: "Great progress this semester!",
    });

    expect(result.status).toBe("COMPLETED");
    expect(mockPrisma.mentorship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          menteeFeedback: "Great progress this semester!",
        }),
      }),
    );
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: menteeId,
          type: "MENTORSHIP_COMPLETED",
        }),
      }),
    );
  });

  it("forbids the mentee from completing the mentorship", async () => {
    mockPrisma.mentorship.findUnique.mockResolvedValue({
      id: "m-1",
      mentorId,
      menteeId,
      status: "ACTIVE",
    } as never);

    await expect(
      mentorshipService.completeMentorship(menteeId, "m-1", {}),
    ).rejects.toThrow(
      "Only the mentor can manage sessions and close a mentorship.",
    );
  });
});

describe("rateMentor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores the mentee's rating of the mentor", async () => {
    mockPrisma.mentorship.findUnique.mockResolvedValue({
      id: "m-1",
      menteeId,
      status: "COMPLETED",
      mentorRating: null,
    } as never);
    mockPrisma.mentorship.update.mockResolvedValue({
      id: "m-1",
      mentorRating: 5,
      mentorFeedback: "Really helpful!",
    } as never);

    const result = await mentorshipService.rateMentor(menteeId, "m-1", {
      rating: 5,
      feedback: "Really helpful!",
    });

    expect(result.mentorRating).toBe(5);
    expect(mockPrisma.mentorship.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mentorRating: 5,
          mentorFeedback: "Really helpful!",
        }),
      }),
    );
  });

  it("forbids the mentor from rating themselves", async () => {
    mockPrisma.mentorship.findUnique.mockResolvedValue({
      id: "m-1",
      menteeId,
      status: "COMPLETED",
      mentorRating: null,
    } as never);

    await expect(
      mentorshipService.rateMentor(mentorId, "m-1", { rating: 5 }),
    ).rejects.toThrow("Only the mentee can rate the mentor.");
  });

  it("forbids rating an active mentorship", async () => {
    mockPrisma.mentorship.findUnique.mockResolvedValue({
      id: "m-1",
      menteeId,
      status: "ACTIVE",
      mentorRating: null,
    } as never);

    await expect(
      mentorshipService.rateMentor(menteeId, "m-1", { rating: 5 }),
    ).rejects.toThrow(
      "You can only rate your mentor after the mentorship has been completed.",
    );
  });

  it("forbids rating a mentor twice", async () => {
    mockPrisma.mentorship.findUnique.mockResolvedValue({
      id: "m-1",
      menteeId,
      status: "COMPLETED",
      mentorRating: 4,
    } as never);

    await expect(
      mentorshipService.rateMentor(menteeId, "m-1", { rating: 5 }),
    ).rejects.toThrow("You have already rated this mentor.");
  });
});

describe("createSession", () => {
  it("forbids the mentee from scheduling sessions", async () => {
    mockPrisma.mentorship.findUnique.mockResolvedValue({
      id: "m-1",
      mentorId,
      menteeId,
      status: "ACTIVE",
    } as never);

    await expect(
      mentorshipService.createSession(menteeId, "m-1", {
        scheduledAt: new Date().toISOString(),
      }),
    ).rejects.toThrow(
      "Only the mentor can manage sessions and close a mentorship.",
    );
  });
});
