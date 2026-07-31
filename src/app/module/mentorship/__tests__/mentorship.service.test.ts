import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
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
});

// ─── createMentorshipRequest ────────────────────────────────────────

describe("createMentorshipRequest", () => {
  it("rejects requesting yourself as a mentor", async () => {
    await expect(
      mentorshipService.createMentorshipRequest(menteeId, { mentorId: menteeId }),
    ).rejects.toThrow("You cannot request mentorship from yourself.");
  });

  it("throws NOT_FOUND when the mentor is not an opted-in active alumni", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      mentorshipService.createMentorshipRequest(menteeId, { mentorId: mentorId }),
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
      mentorshipService.createMentorshipRequest(menteeId, { mentorId }),
    ).rejects.toThrow("You already have an active mentorship request with this mentor.");
  });

  it("creates a request and notifies the mentor", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: mentorId,
      name: "Alice",
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
    });

    expect(result.id).toBe("req-1");
    expect(mockPrisma.mentorshipRequest.create).toHaveBeenCalledWith({
      data: {
        mentorId,
        menteeId,
        topic: "Career advice",
        message: "Would love your guidance.",
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
    ).rejects.toThrow("Mentors can accept or reject a request, but not withdraw it.");
  });

  it("lets a mentor accept the request and notify the mentee", async () => {
    mockPrisma.mentorshipRequest.findUnique.mockResolvedValue(
      pendingRequest as never,
    );
    mockPrisma.mentorshipRequest.update.mockResolvedValue({
      ...pendingRequest,
      status: "ACCEPTED",
    } as never);
    mockPrisma.notification.create.mockResolvedValue({} as never);

    const result = await mentorshipService.updateMentorshipRequest(mentorId, "req-1", {
      status: "ACCEPTED",
    });

    expect(result.status).toBe("ACCEPTED");
    expect(mockPrisma.mentorshipRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "ACCEPTED", respondedAt: expect.any(Date) },
      include: expect.any(Object),
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: menteeId,
          senderId: mentorId,
          type: "MENTORSHIP_REQUEST_UPDATED",
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

    const result = await mentorshipService.updateMentorshipRequest(menteeId, "req-1", {
      status: "WITHDRAWN",
    });

    expect(result.status).toBe("WITHDRAWN");
  });
});
