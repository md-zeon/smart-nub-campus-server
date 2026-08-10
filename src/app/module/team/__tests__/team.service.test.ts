import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockNotificationService, mockSocketServer } = vi.hoisted(() => ({
  mockNotificationService: {
    createNotification: vi.fn(),
  },
  mockSocketServer: {
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
  },
  mockPrisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
    teamRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    teamRequestSkill: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    teamApplication: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    teamMember: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    teamBookmark: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../../../app/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../../../../app/lib/socket/socket-server", () => ({
  getSocketServer: vi.fn().mockReturnValue(mockSocketServer),
}));
vi.mock("../../notification/notification.service", () => ({
  notificationService: mockNotificationService,
}));

import { teamService } from "../team.service";
import { getSocketServer } from "../../../../app/lib/socket/socket-server";

const USER_ID = "user-1";
const OTHER_USER_ID = "user-2";
const TEAM_ID = "team-1";
const APP_ID = "app-1";

const mockTeamRequest = {
  id: TEAM_ID,
  title: "Smart NUB",
  description: "Build a campus platform",
  lookingForCount: 3,
  currentMemberCount: 1,
  status: "OPEN",
  category: "WEB",
  difficulty: "INTERMEDIATE",
  meetingPreference: "FLEXIBLE",
  creatorId: USER_ID,
  viewCount: 0,
  bookmarkCount: 0,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  teamRequestSkills: [
    {
      id: "trs-1",
      teamRequestId: TEAM_ID,
      tagId: "tag-1",
      tag: { id: "tag-1", name: "React", slug: "react" },
    },
  ],
  teamMembers: [
    {
      id: "tm-1",
      teamRequestId: TEAM_ID,
      userId: USER_ID,
      role: "LEADER",
      joinedAt: new Date("2025-01-01"),
      user: { id: USER_ID, name: "Alice", email: "alice@test.com", image: null },
    },
  ],
  creator: { id: USER_ID, name: "Alice", email: "alice@test.com", image: null },
  _count: { teamApplications: 0, teamMembers: 1 },
};

beforeEach(() => {
  vi.resetAllMocks();

  for (const model of Object.values(mockPrisma)) {
    if (model && typeof model === "object") {
      for (const method of Object.values(model as Record<string, unknown>)) {
        if (typeof method === "function") {
          (method as any).mockResolvedValue(undefined);
        }
      }
    }
  }

  mockPrisma.$transaction.mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg(mockPrisma);
  });

  mockNotificationService.createNotification.mockResolvedValue({});
  vi.mocked(getSocketServer).mockReturnValue(mockSocketServer as any);
  mockSocketServer.to.mockReturnValue({ emit: vi.fn() });
});

// ─── createTeamRequest ──────────────────────────────────────────────────────

describe("createTeamRequest", () => {
  it("creates a team request and adds the creator as LEADER", async () => {
    mockPrisma.teamRequest.create.mockResolvedValue(mockTeamRequest as any);

    const result = await teamService.createTeamRequest(
      {
        title: "Smart NUB",
        description: "Build a campus platform",
        lookingForCount: 3,
        skillTagIds: ["tag-1"],
      },
      USER_ID,
    );

    expect(result.id).toBe(TEAM_ID);
    expect(mockPrisma.teamRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Smart NUB",
          description: "Build a campus platform",
          lookingForCount: 3,
          creatorId: USER_ID,
          meetingPreference: "FLEXIBLE",
          teamRequestSkills: { create: [{ tagId: "tag-1" }] },
          teamMembers: { create: { userId: USER_ID, role: "LEADER" } },
        }),
      }),
    );
  });

  it("applies all optional fields", async () => {
    mockPrisma.teamRequest.create.mockResolvedValue(mockTeamRequest as any);

    await teamService.createTeamRequest(
      {
        title: "Smart NUB",
        description: "Build a campus platform",
        lookingForCount: 3,
        projectName: "Campus App",
        deadline: "2026-06-30",
        category: "WEB",
        difficulty: "ADVANCED",
        meetingPreference: "HYBRID",
        contactInfo: "alice@test.com",
        applicationForm: {
          fields: [{ key: "github", required: true }],
          questions: [],
        },
        skillTagIds: ["tag-1", "tag-2"],
      },
      USER_ID,
    );

    expect(mockPrisma.teamRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectName: "Campus App",
          deadline: new Date("2026-06-30"),
          category: "WEB",
          difficulty: "ADVANCED",
          meetingPreference: "HYBRID",
          contactInfo: "alice@test.com",
          applicationForm: expect.any(Object),
          teamRequestSkills: { create: [{ tagId: "tag-1" }, { tagId: "tag-2" }] },
        }),
      }),
    );
  });
});

// ─── getTeamRequest ─────────────────────────────────────────────────────────

describe("getTeamRequest", () => {
  it("returns the team request and increments the view count", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(mockTeamRequest as any);
    mockPrisma.teamRequest.update.mockResolvedValue({});

    const result = await teamService.getTeamRequest(TEAM_ID);

    expect(result.id).toBe(TEAM_ID);
    expect(result.isBookmarked).toBe(false);
    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEAM_ID },
        data: { viewCount: { increment: 1 } },
      }),
    );
  });

  it("marks isBookmarked true when the user bookmarked the team", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(mockTeamRequest as any);
    mockPrisma.teamRequest.update.mockResolvedValue({});
    mockPrisma.teamBookmark.findUnique.mockResolvedValue({
      id: "bm-1",
      teamRequestId: TEAM_ID,
      userId: USER_ID,
    });

    const result = await teamService.getTeamRequest(TEAM_ID, USER_ID);

    expect(result.isBookmarked).toBe(true);
    expect(mockPrisma.teamBookmark.findUnique).toHaveBeenCalledWith({
      where: {
        teamRequestId_userId: { teamRequestId: TEAM_ID, userId: USER_ID },
      },
    });
  });

  it("skips the bookmark lookup when no userId is provided", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(mockTeamRequest as any);
    mockPrisma.teamRequest.update.mockResolvedValue({});

    await teamService.getTeamRequest(TEAM_ID);

    expect(mockPrisma.teamBookmark.findUnique).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(teamService.getTeamRequest("missing")).rejects.toThrow(
      "Team request not found.",
    );
  });
});

// ─── listTeamRequests ───────────────────────────────────────────────────────

describe("listTeamRequests", () => {
  const baseTeam = {
    id: TEAM_ID,
    title: "Smart NUB",
    description: "Build a campus platform",
    lookingForCount: 3,
    currentMemberCount: 1,
    status: "OPEN",
    creatorId: USER_ID,
    createdAt: new Date("2025-01-01"),
    teamRequestSkills: [
      {
        id: "trs-1",
        teamRequestId: TEAM_ID,
        tagId: "tag-1",
        tag: { id: "tag-1", name: "React", slug: "react" },
      },
    ],
    creator: { id: USER_ID, name: "Alice", image: null },
    teamMembers: [{ userId: "member-1" }],
    _count: { teamApplications: 0, teamMembers: 1 },
  };

  it("returns paginated results with default params", async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([baseTeam] as any);
    mockPrisma.teamRequest.count.mockResolvedValue(1);

    const result = await teamService.listTeamRequests({}, USER_ID);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].isBookmarked).toBe(false);
    expect(result.data[0].hasApplied).toBe(false);
    expect(result.meta).toEqual({ page: 1, limit: 12, total: 1, totalPages: 1 });
    expect(mockPrisma.teamRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 12,
        orderBy: { createdAt: "desc" },
        where: { isDeleted: false },
      }),
    );
    expect(mockPrisma.teamRequest.count).toHaveBeenCalledWith({
      where: { isDeleted: false },
    });
  });

  it("flags bookmarked and applied status for the current user", async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        ...baseTeam,
        teamBookmarks: [{ id: "bm-1" }],
        teamApplications: [{ id: APP_ID, status: "PENDING" }],
      },
    ] as any);
    mockPrisma.teamRequest.count.mockResolvedValue(1);

    const result = await teamService.listTeamRequests({}, USER_ID);

    expect(result.data[0].isBookmarked).toBe(true);
    expect(result.data[0].hasApplied).toBe(true);
  });

  it("applies filters, search, excludeOwn, bookmarked, and pagination", async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([]);
    mockPrisma.teamRequest.count.mockResolvedValue(0);

    const result = await teamService.listTeamRequests(
      {
        status: "OPEN",
        category: "WEB",
        difficulty: "ADVANCED",
        meetingPreference: "HYBRID",
        skill: "react",
        search: "campus",
        sort: "deadline",
        page: 2,
        limit: 5,
        excludeOwn: true,
        bookmarked: true,
      },
      USER_ID,
    );

    expect(mockPrisma.teamRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isDeleted: false,
          creatorId: { not: USER_ID },
          status: "OPEN",
          category: "WEB",
          difficulty: "ADVANCED",
          meetingPreference: "HYBRID",
          teamRequestSkills: { some: { tag: { slug: "react" } } },
          teamBookmarks: { some: { userId: USER_ID } },
          OR: [
            { title: { contains: "campus", mode: "insensitive" } },
            { description: { contains: "campus", mode: "insensitive" } },
          ],
        },
        skip: 5,
        take: 5,
        orderBy: { deadline: "asc" },
      }),
    );
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
  });

  it("sorts by application count when sort=applications", async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([]);
    mockPrisma.teamRequest.count.mockResolvedValue(0);

    await teamService.listTeamRequests({ sort: "applications" }, USER_ID);

    expect(mockPrisma.teamRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { teamApplications: { _count: "desc" } },
      }),
    );
  });

  it("works without a userId", async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([baseTeam] as any);
    mockPrisma.teamRequest.count.mockResolvedValue(1);

    const result = await teamService.listTeamRequests({});

    expect(result.data[0].isBookmarked).toBe(false);
    expect(result.data[0].hasApplied).toBe(false);
  });
});

// ─── updateTeamRequest ──────────────────────────────────────────────────────

describe("updateTeamRequest", () => {
  const existing = {
    id: TEAM_ID,
    creatorId: USER_ID,
    currentMemberCount: 1,
    lookingForCount: 3,
    status: "OPEN",
  };

  it("updates allowed fields when called by the creator", async () => {
    mockPrisma.teamRequest.findUnique
      .mockResolvedValueOnce(existing as any)
      .mockResolvedValue(mockTeamRequest as any);
    mockPrisma.teamRequest.update.mockResolvedValue({});
    mockPrisma.teamRequestSkill.deleteMany.mockResolvedValue({});
    mockPrisma.teamRequestSkill.createMany.mockResolvedValue({});

    const result = await teamService.updateTeamRequest(
      TEAM_ID,
      { title: "New title", description: "New description", deadline: "2026-12-31" },
      USER_ID,
    );

    expect(result.id).toBe(TEAM_ID);
    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEAM_ID },
        data: expect.objectContaining({
          title: "New title",
          description: "New description",
          deadline: new Date("2026-12-31"),
        }),
      }),
    );
  });

  it("replaces skill tags when skillTagIds is provided", async () => {
    mockPrisma.teamRequest.findUnique
      .mockResolvedValueOnce(existing as any)
      .mockResolvedValue(mockTeamRequest as any);
    mockPrisma.teamRequest.update.mockResolvedValue({});
    mockPrisma.teamRequestSkill.deleteMany.mockResolvedValue({});
    mockPrisma.teamRequestSkill.createMany.mockResolvedValue({});

    await teamService.updateTeamRequest(
      TEAM_ID,
      { skillTagIds: ["tag-5", "tag-6"] },
      USER_ID,
    );

    expect(mockPrisma.teamRequestSkill.deleteMany).toHaveBeenCalledWith({
      where: { teamRequestId: TEAM_ID },
    });
    expect(mockPrisma.teamRequestSkill.createMany).toHaveBeenCalledWith({
      data: [
        { teamRequestId: TEAM_ID, tagId: "tag-5" },
        { teamRequestId: TEAM_ID, tagId: "tag-6" },
      ],
    });
  });

  it("decreases lookingForCount when it drops below current member count", async () => {
    mockPrisma.teamRequest.findUnique
      .mockResolvedValueOnce({ ...existing, currentMemberCount: 5 } as any)
      .mockResolvedValue(mockTeamRequest as any);
    mockPrisma.teamRequest.update.mockResolvedValue({});
    mockPrisma.teamRequestSkill.deleteMany.mockResolvedValue({});
    mockPrisma.teamRequestSkill.createMany.mockResolvedValue({});

    await teamService.updateTeamRequest(TEAM_ID, { lookingForCount: 3 }, USER_ID);

    expect(mockPrisma.teamRequest.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.teamRequest.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: TEAM_ID },
        data: { lookingForCount: 3 },
      }),
    );
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(
      teamService.updateTeamRequest(TEAM_ID, { title: "x" }, USER_ID),
    ).rejects.toThrow("Team request not found.");
  });

  it("throws FORBIDDEN when a non-creator tries to update", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      ...existing,
      creatorId: OTHER_USER_ID,
    } as any);

    await expect(
      teamService.updateTeamRequest(TEAM_ID, { title: "x" }, USER_ID),
    ).rejects.toThrow("You can only edit your own team requests.");
  });
});

// ─── deleteTeamRequest ──────────────────────────────────────────────────────

describe("deleteTeamRequest", () => {
  it("soft deletes the team request when called by the creator", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: USER_ID,
    } as any);
    mockPrisma.teamRequest.update.mockResolvedValue({});

    const result = await teamService.deleteTeamRequest(TEAM_ID, USER_ID);

    expect(result.message).toBe("Team request deleted successfully.");
    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEAM_ID },
        data: { isDeleted: true, deletedAt: expect.any(Date) },
      }),
    );
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(teamService.deleteTeamRequest(TEAM_ID, USER_ID)).rejects.toThrow(
      "Team request not found.",
    );
  });

  it("throws FORBIDDEN when a non-creator tries to delete", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: OTHER_USER_ID,
    } as any);

    await expect(teamService.deleteTeamRequest(TEAM_ID, USER_ID)).rejects.toThrow(
      "You can only delete your own team requests.",
    );
  });
});

// ─── applyToTeam ────────────────────────────────────────────────────────────

describe("applyToTeam", () => {
  it("creates an application and notifies the creator", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: OTHER_USER_ID,
      applicationForm: null,
    } as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue(null);
    mockPrisma.teamApplication.create.mockResolvedValue({
      id: APP_ID,
      teamRequestId: TEAM_ID,
      applicantId: USER_ID,
      message: "I'd love to join",
      status: "PENDING",
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
      applicant: { id: USER_ID, name: "Alice", email: "alice@test.com", image: null },
    } as any);

    const result = await teamService.applyToTeam(TEAM_ID, USER_ID, {
      message: "I'd love to join",
      responses: { name: "Alice", email: "alice@test.com" },
    });

    expect(result.status).toBe("PENDING");
    expect(mockPrisma.teamApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teamRequestId: TEAM_ID,
          applicantId: USER_ID,
          message: "I'd love to join",
          responses: { name: "Alice", email: "alice@test.com" },
        }),
      }),
    );
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TEAM_APPLICATION", userId: OTHER_USER_ID }),
    );
    expect(getSocketServer).toHaveBeenCalled();
    expect(mockSocketServer.to).toHaveBeenCalledWith(`team:${TEAM_ID}`);
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(teamService.applyToTeam(TEAM_ID, USER_ID, {})).rejects.toThrow(
      "Team request not found.",
    );
  });

  it("prevents applying to your own team request", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: USER_ID,
    } as any);

    await expect(teamService.applyToTeam(TEAM_ID, USER_ID, {})).rejects.toThrow(
      "You cannot apply to your own team request.",
    );
  });

  it("throws CONFLICT when already applied", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: OTHER_USER_ID,
    } as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue({ id: APP_ID } as any);

    await expect(teamService.applyToTeam(TEAM_ID, USER_ID, {})).rejects.toThrow(
      "You have already applied to this team request.",
    );
  });

  it("requires all required form fields from the custom application form", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: OTHER_USER_ID,
      applicationForm: {
        fields: [{ key: "github", required: true }],
        questions: [
          { id: "q1", label: "Why us?", type: "PARAGRAPH", required: true },
        ],
      },
    } as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue(null);

    await expect(
      teamService.applyToTeam(TEAM_ID, USER_ID, { responses: { name: "Alice" } }),
    ).rejects.toThrow("Please fill in all required fields before applying.");
  });

  it("allows applying when required form fields are answered", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: OTHER_USER_ID,
      applicationForm: {
        fields: [{ key: "github", required: true }],
        questions: [
          { id: "q1", label: "Why us?", type: "PARAGRAPH", required: true },
        ],
      },
    } as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue(null);
    mockPrisma.teamApplication.create.mockResolvedValue({ id: APP_ID } as any);

    const result = await teamService.applyToTeam(TEAM_ID, USER_ID, {
      responses: {
        github: "https://github.com/alice",
        q1: "Because I am great",
      },
    });

    expect(result.id).toBe(APP_ID);
  });
});

// ─── reviewApplication ──────────────────────────────────────────────────────

describe("reviewApplication", () => {
  const baseTeam = {
    id: TEAM_ID,
    creatorId: USER_ID,
    currentMemberCount: 1,
    lookingForCount: 2,
    status: "OPEN",
  };
  const pendingApplication = {
    id: APP_ID,
    teamRequestId: TEAM_ID,
    applicantId: OTHER_USER_ID,
    status: "PENDING",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  it("accepts an application, adds the member, and fills the team", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(baseTeam as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue(
      pendingApplication as any,
    );
    mockPrisma.teamMember.findUnique.mockResolvedValue(null);
    mockPrisma.teamApplication.update.mockResolvedValue({
      ...pendingApplication,
      status: "ACCEPTED",
    } as any);
    mockPrisma.teamMember.create.mockResolvedValue({});
    mockPrisma.teamRequest.update.mockResolvedValue({});

    const result = await teamService.reviewApplication(
      TEAM_ID,
      APP_ID,
      "ACCEPTED",
      USER_ID,
    );

    expect(result.status).toBe("ACCEPTED");
    expect(mockPrisma.teamMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { teamRequestId: TEAM_ID, userId: OTHER_USER_ID, role: "MEMBER" },
      }),
    );
    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEAM_ID },
        data: { currentMemberCount: 2, status: "FILLED" },
      }),
    );
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TEAM_APPLICATION_ACCEPTED",
        userId: OTHER_USER_ID,
      }),
    );
    expect(mockSocketServer.to).toHaveBeenCalledWith(`team:${TEAM_ID}`);
  });

  it("rejects an application without adding a member", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(baseTeam as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue(
      pendingApplication as any,
    );
    mockPrisma.teamApplication.update.mockResolvedValue({
      ...pendingApplication,
      status: "REJECTED",
    } as any);

    const result = await teamService.reviewApplication(
      TEAM_ID,
      APP_ID,
      "REJECTED",
      USER_ID,
    );

    expect(result.status).toBe("REJECTED");
    expect(mockPrisma.teamMember.create).not.toHaveBeenCalled();
    expect(mockPrisma.teamRequest.update).not.toHaveBeenCalled();
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TEAM_APPLICATION_REJECTED" }),
    );
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(
      teamService.reviewApplication(TEAM_ID, APP_ID, "ACCEPTED", USER_ID),
    ).rejects.toThrow("Team request not found.");
  });

  it("throws FORBIDDEN when the reviewer is not the creator", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      ...baseTeam,
      creatorId: OTHER_USER_ID,
    } as any);

    await expect(
      teamService.reviewApplication(TEAM_ID, APP_ID, "ACCEPTED", USER_ID),
    ).rejects.toThrow("Only the creator can review applications.");
  });

  it("throws NOT_FOUND when the application does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(baseTeam as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue(null);

    await expect(
      teamService.reviewApplication(TEAM_ID, APP_ID, "ACCEPTED", USER_ID),
    ).rejects.toThrow("Application not found.");
  });

  it("throws BAD_REQUEST when the application belongs to another team", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(baseTeam as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue({
      ...pendingApplication,
      teamRequestId: "other-team",
    } as any);

    await expect(
      teamService.reviewApplication(TEAM_ID, APP_ID, "ACCEPTED", USER_ID),
    ).rejects.toThrow("Application does not belong to this team request.");
  });

  it("throws BAD_REQUEST when the application is not pending", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(baseTeam as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue({
      ...pendingApplication,
      status: "REJECTED",
    } as any);

    await expect(
      teamService.reviewApplication(TEAM_ID, APP_ID, "ACCEPTED", USER_ID),
    ).rejects.toThrow("Only pending applications can be reviewed.");
  });

  it("throws BAD_REQUEST when the team is already full", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      ...baseTeam,
      currentMemberCount: 2,
      lookingForCount: 2,
    } as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue(
      pendingApplication as any,
    );

    await expect(
      teamService.reviewApplication(TEAM_ID, APP_ID, "ACCEPTED", USER_ID),
    ).rejects.toThrow("Team is already full.");
  });

  it("throws CONFLICT when the applicant is already a member", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(baseTeam as any);
    mockPrisma.teamApplication.findUnique.mockResolvedValue(
      pendingApplication as any,
    );
    mockPrisma.teamMember.findUnique.mockResolvedValue({ id: "tm-x" } as any);

    await expect(
      teamService.reviewApplication(TEAM_ID, APP_ID, "ACCEPTED", USER_ID),
    ).rejects.toThrow("User is already a team member.");
  });
});

// ─── withdrawApplication ────────────────────────────────────────────────────

describe("withdrawApplication", () => {
  it("withdraws a pending application", async () => {
    mockPrisma.teamApplication.findUnique.mockResolvedValue({
      id: APP_ID,
      teamRequestId: TEAM_ID,
      applicantId: USER_ID,
      status: "PENDING",
    } as any);
    mockPrisma.teamApplication.update.mockResolvedValue({
      id: APP_ID,
      teamRequestId: TEAM_ID,
      applicantId: USER_ID,
      status: "WITHDRAWN",
    } as any);

    const result = await teamService.withdrawApplication(TEAM_ID, USER_ID);

    expect(result.status).toBe("WITHDRAWN");
    expect(mockPrisma.teamApplication.update).toHaveBeenCalledWith({
      where: { id: APP_ID },
      data: { status: "WITHDRAWN" },
    });
  });

  it("throws NOT_FOUND when the application does not exist", async () => {
    mockPrisma.teamApplication.findUnique.mockResolvedValue(null);

    await expect(teamService.withdrawApplication(TEAM_ID, USER_ID)).rejects.toThrow(
      "Application not found.",
    );
  });

  it("throws BAD_REQUEST when the application is not pending", async () => {
    mockPrisma.teamApplication.findUnique.mockResolvedValue({
      id: APP_ID,
      status: "ACCEPTED",
    } as any);

    await expect(teamService.withdrawApplication(TEAM_ID, USER_ID)).rejects.toThrow(
      "Only pending applications can be withdrawn.",
    );
  });
});

// ─── getTeamMembers ─────────────────────────────────────────────────────────

describe("getTeamMembers", () => {
  it("returns team members ordered by join date", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({ id: TEAM_ID } as any);
    mockPrisma.teamMember.findMany.mockResolvedValue([
      {
        id: "tm-1",
        teamRequestId: TEAM_ID,
        userId: USER_ID,
        role: "LEADER",
        user: { id: USER_ID, name: "Alice", email: "alice@test.com", image: null },
      },
      {
        id: "tm-2",
        teamRequestId: TEAM_ID,
        userId: OTHER_USER_ID,
        role: "MEMBER",
        user: { id: OTHER_USER_ID, name: "Bob", email: "bob@test.com", image: null },
      },
    ] as any);

    const result = await teamService.getTeamMembers(TEAM_ID);

    expect(result).toHaveLength(2);
    expect(mockPrisma.teamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamRequestId: TEAM_ID },
        orderBy: { joinedAt: "asc" },
      }),
    );
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(teamService.getTeamMembers(TEAM_ID)).rejects.toThrow(
      "Team request not found.",
    );
  });
});

// ─── leaveTeam ──────────────────────────────────────────────────────────────

describe("leaveTeam", () => {
  it("lets a regular member leave and decrements the count", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: USER_ID,
      currentMemberCount: 3,
      status: "OPEN",
    } as any);
    mockPrisma.teamMember.findUnique.mockResolvedValue({
      id: "tm-2",
      teamRequestId: TEAM_ID,
      userId: OTHER_USER_ID,
      role: "MEMBER",
    } as any);
    mockPrisma.teamMember.delete.mockResolvedValue({});
    mockPrisma.teamRequest.update.mockResolvedValue({});

    const result = await teamService.leaveTeam(TEAM_ID, OTHER_USER_ID);

    expect(result.message).toBe("You have left the team.");
    expect(mockPrisma.teamMember.delete).toHaveBeenCalledWith({
      where: { id: "tm-2" },
    });
    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEAM_ID },
        data: { currentMemberCount: 2, status: "OPEN" },
      }),
    );
  });

  it("allows the leader to leave when no other members exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: USER_ID,
      currentMemberCount: 1,
      status: "OPEN",
    } as any);
    mockPrisma.teamMember.findUnique.mockResolvedValue({
      id: "tm-1",
      teamRequestId: TEAM_ID,
      userId: USER_ID,
      role: "LEADER",
    } as any);
    mockPrisma.teamMember.count.mockResolvedValue(0);
    mockPrisma.teamMember.delete.mockResolvedValue({});
    mockPrisma.teamRequest.update.mockResolvedValue({});

    const result = await teamService.leaveTeam(TEAM_ID, USER_ID);

    expect(result.message).toBe("You have left the team.");
  });

  it("blocks the leader from leaving when other members exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: USER_ID,
      currentMemberCount: 3,
      status: "OPEN",
    } as any);
    mockPrisma.teamMember.findUnique.mockResolvedValue({
      id: "tm-1",
      teamRequestId: TEAM_ID,
      userId: USER_ID,
      role: "LEADER",
    } as any);
    mockPrisma.teamMember.count.mockResolvedValue(2);

    await expect(teamService.leaveTeam(TEAM_ID, USER_ID)).rejects.toThrow(
      "Team creator cannot leave while other members exist.",
    );
  });

  it("reverts a FILLED team back to OPEN when a member leaves", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: USER_ID,
      currentMemberCount: 2,
      status: "FILLED",
    } as any);
    mockPrisma.teamMember.findUnique.mockResolvedValue({
      id: "tm-2",
      teamRequestId: TEAM_ID,
      userId: OTHER_USER_ID,
      role: "MEMBER",
    } as any);
    mockPrisma.teamMember.delete.mockResolvedValue({});
    mockPrisma.teamRequest.update.mockResolvedValue({});

    await teamService.leaveTeam(TEAM_ID, OTHER_USER_ID);

    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currentMemberCount: 1, status: "OPEN" },
      }),
    );
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(teamService.leaveTeam(TEAM_ID, USER_ID)).rejects.toThrow(
      "Team request not found.",
    );
  });

  it("throws NOT_FOUND when the user is not a member", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({ id: TEAM_ID } as any);
    mockPrisma.teamMember.findUnique.mockResolvedValue(null);

    await expect(teamService.leaveTeam(TEAM_ID, USER_ID)).rejects.toThrow(
      "You are not a member of this team.",
    );
  });
});

// ─── removeMember ───────────────────────────────────────────────────────────

describe("removeMember", () => {
  it("lets a leader remove another member", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: USER_ID,
      currentMemberCount: 3,
      status: "OPEN",
    } as any);
    mockPrisma.teamMember.findUnique
      .mockResolvedValueOnce({
        id: "tm-1",
        teamRequestId: TEAM_ID,
        userId: USER_ID,
        role: "LEADER",
      } as any)
      .mockResolvedValueOnce({
        id: "tm-2",
        teamRequestId: TEAM_ID,
        userId: OTHER_USER_ID,
        role: "MEMBER",
      } as any);
    mockPrisma.teamMember.delete.mockResolvedValue({});
    mockPrisma.teamRequest.update.mockResolvedValue({});

    const result = await teamService.removeMember(TEAM_ID, "tm-2", USER_ID);

    expect(result.message).toBe("Member removed successfully.");
    expect(mockPrisma.teamMember.delete).toHaveBeenCalledWith({
      where: { id: "tm-2" },
    });
    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currentMemberCount: 2, status: "OPEN" },
      }),
    );
  });

  it("reverts a FILLED team back to OPEN", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: USER_ID,
      currentMemberCount: 2,
      status: "FILLED",
    } as any);
    mockPrisma.teamMember.findUnique
      .mockResolvedValueOnce({
        id: "tm-1",
        teamRequestId: TEAM_ID,
        userId: USER_ID,
        role: "LEADER",
      } as any)
      .mockResolvedValueOnce({
        id: "tm-2",
        teamRequestId: TEAM_ID,
        userId: OTHER_USER_ID,
        role: "MEMBER",
      } as any);
    mockPrisma.teamMember.delete.mockResolvedValue({});
    mockPrisma.teamRequest.update.mockResolvedValue({});

    await teamService.removeMember(TEAM_ID, "tm-2", USER_ID);

    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currentMemberCount: 1, status: "OPEN" },
      }),
    );
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(
      teamService.removeMember(TEAM_ID, "tm-2", USER_ID),
    ).rejects.toThrow("Team request not found.");
  });

  it("throws FORBIDDEN when the requester is not a leader", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({ id: TEAM_ID } as any);
    mockPrisma.teamMember.findUnique.mockResolvedValue({
      id: "tm-3",
      teamRequestId: TEAM_ID,
      userId: USER_ID,
      role: "MEMBER",
    } as any);

    await expect(
      teamService.removeMember(TEAM_ID, "tm-2", USER_ID),
    ).rejects.toThrow("Only the team leader can remove members.");
  });

  it("throws BAD_REQUEST when the leader tries to remove themself", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({ id: TEAM_ID } as any);
    mockPrisma.teamMember.findUnique.mockResolvedValue({
      id: "tm-1",
      teamRequestId: TEAM_ID,
      userId: USER_ID,
      role: "LEADER",
    } as any);

    await expect(
      teamService.removeMember(TEAM_ID, "tm-1", USER_ID),
    ).rejects.toThrow("Use the leave team endpoint to leave the team.");
  });

  it("throws NOT_FOUND when the target member is not in the team", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({ id: TEAM_ID } as any);
    mockPrisma.teamMember.findUnique
      .mockResolvedValueOnce({
        id: "tm-1",
        teamRequestId: TEAM_ID,
        userId: USER_ID,
        role: "LEADER",
      } as any)
      .mockResolvedValueOnce({
        id: "tm-2",
        teamRequestId: "other-team",
        userId: OTHER_USER_ID,
        role: "MEMBER",
      } as any);

    await expect(
      teamService.removeMember(TEAM_ID, "tm-2", USER_ID),
    ).rejects.toThrow("Member not found in this team.");
  });
});

// ─── getCategoryCounts ──────────────────────────────────────────────────────

describe("getCategoryCounts", () => {
  it("returns counts for non-null categories", async () => {
    mockPrisma.teamRequest.groupBy.mockResolvedValue([
      { category: "WEB", _count: { category: 5 } },
      { category: null, _count: { category: 2 } },
      { category: "AI", _count: { category: 3 } },
    ] as any);

    const result = await teamService.getCategoryCounts();

    expect(result).toEqual([
      { category: "WEB", count: 5 },
      { category: "AI", count: 3 },
    ]);
    expect(mockPrisma.teamRequest.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["category"],
        where: { isDeleted: false, status: "OPEN" },
      }),
    );
  });

  it("returns an empty array when there are no counts", async () => {
    mockPrisma.teamRequest.groupBy.mockResolvedValue([] as any);

    const result = await teamService.getCategoryCounts();

    expect(result).toEqual([]);
  });
});

// ─── getPopularSkills ───────────────────────────────────────────────────────

describe("getPopularSkills", () => {
  it("maps skill ids to names and falls back to Unknown", async () => {
    mockPrisma.teamRequestSkill.groupBy.mockResolvedValue([
      { tagId: "tag-1", _count: { tagId: 3 } },
      { tagId: "tag-2", _count: { tagId: 1 } },
    ] as any);
    mockPrisma.tag.findMany.mockResolvedValue([{ id: "tag-1", name: "React" }] as any);

    const result = await teamService.getPopularSkills();

    expect(result).toEqual([
      { tagId: "tag-1", name: "React", count: 3 },
      { tagId: "tag-2", name: "Unknown", count: 1 },
    ]);
    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["tag-1", "tag-2"] } },
      select: { id: true, name: true },
    });
  });

  it("returns an empty array when there are no skills", async () => {
    mockPrisma.teamRequestSkill.groupBy.mockResolvedValue([] as any);
    mockPrisma.tag.findMany.mockResolvedValue([] as any);

    const result = await teamService.getPopularSkills();

    expect(result).toEqual([]);
  });
});

// ─── getMyTeams ─────────────────────────────────────────────────────────────

describe("getMyTeams", () => {
  it("returns teams created by the user", async () => {
    mockPrisma.teamRequest.findMany.mockResolvedValue([mockTeamRequest] as any);

    const result = await teamService.getMyTeams(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(TEAM_ID);
    expect(mockPrisma.teamRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { creatorId: USER_ID, isDeleted: false },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});

// ─── getMyApplications ──────────────────────────────────────────────────────

describe("getMyApplications", () => {
  it("returns applications made by the user with nested team info", async () => {
    mockPrisma.teamApplication.findMany.mockResolvedValue([
      {
        id: APP_ID,
        teamRequestId: TEAM_ID,
        applicantId: USER_ID,
        status: "PENDING",
        createdAt: new Date("2025-01-01"),
        teamRequest: {
          id: TEAM_ID,
          title: "Smart NUB",
          teamRequestSkills: [],
          creator: { id: OTHER_USER_ID, name: "Bob", image: null },
          _count: { teamMembers: 2 },
        },
      },
    ] as any);

    const result = await teamService.getMyApplications(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].teamRequest.id).toBe(TEAM_ID);
    expect(mockPrisma.teamApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applicantId: USER_ID },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});

// ─── getTeamApplications ────────────────────────────────────────────────────

describe("getTeamApplications", () => {
  it("returns applications for a team as the creator", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: USER_ID,
    } as any);
    mockPrisma.teamApplication.findMany.mockResolvedValue([
      {
        id: APP_ID,
        teamRequestId: TEAM_ID,
        applicantId: OTHER_USER_ID,
        status: "PENDING",
        createdAt: new Date("2025-01-01"),
        applicant: {
          id: OTHER_USER_ID,
          name: "Bob",
          email: "bob@test.com",
          image: null,
        },
      },
    ] as any);

    const result = await teamService.getTeamApplications(TEAM_ID, USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].applicant.name).toBe("Bob");
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(
      teamService.getTeamApplications(TEAM_ID, USER_ID),
    ).rejects.toThrow("Team request not found.");
  });

  it("throws FORBIDDEN when a non-creator views applications", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: OTHER_USER_ID,
    } as any);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "STUDENT" } as any);

    await expect(
      teamService.getTeamApplications(TEAM_ID, USER_ID),
    ).rejects.toThrow("Only the team creator can view applications.");
  });

  it("allows an admin to view applications for a team they do not own", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({
      id: TEAM_ID,
      creatorId: OTHER_USER_ID,
    } as any);
    mockPrisma.user.findUnique.mockResolvedValue({ role: "ADMIN" } as any);
    mockPrisma.teamApplication.findMany.mockResolvedValue([]);

    const result = await teamService.getTeamApplications(TEAM_ID, USER_ID);

    expect(result).toEqual([]);
  });
});

// ─── toggleBookmark ─────────────────────────────────────────────────────────

describe("toggleBookmark", () => {
  it("adds a bookmark when none exists", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({ id: TEAM_ID } as any);
    mockPrisma.teamBookmark.findUnique.mockResolvedValue(null);
    mockPrisma.teamBookmark.create.mockResolvedValue({ id: "bm-1" } as any);
    mockPrisma.teamRequest.update.mockResolvedValue({});

    const result = await teamService.toggleBookmark(TEAM_ID, USER_ID);

    expect(result).toEqual({ message: "Team bookmarked.", bookmarked: true });
    expect(mockPrisma.teamBookmark.create).toHaveBeenCalledWith({
      data: { teamRequestId: TEAM_ID, userId: USER_ID },
    });
    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { bookmarkCount: { increment: 1 } } }),
    );
  });

  it("removes a bookmark when one exists", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue({ id: TEAM_ID } as any);
    mockPrisma.teamBookmark.findUnique.mockResolvedValue({
      id: "bm-1",
      teamRequestId: TEAM_ID,
      userId: USER_ID,
    } as any);
    mockPrisma.teamBookmark.delete.mockResolvedValue({});
    mockPrisma.teamRequest.update.mockResolvedValue({});

    const result = await teamService.toggleBookmark(TEAM_ID, USER_ID);

    expect(result).toEqual({ message: "Bookmark removed.", bookmarked: false });
    expect(mockPrisma.teamBookmark.delete).toHaveBeenCalledWith({
      where: { id: "bm-1" },
    });
    expect(mockPrisma.teamRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { bookmarkCount: { decrement: 1 } } }),
    );
  });

  it("throws NOT_FOUND when the team request does not exist", async () => {
    mockPrisma.teamRequest.findUnique.mockResolvedValue(null);

    await expect(teamService.toggleBookmark(TEAM_ID, USER_ID)).rejects.toThrow(
      "Team request not found.",
    );
  });
});
