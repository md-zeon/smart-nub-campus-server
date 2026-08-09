import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    resource: { findMany: vi.fn() },
    discussion: { findMany: vi.fn() },
    discussionReply: { findMany: vi.fn() },
    question: { findMany: vi.fn() },
    answer: { findMany: vi.fn() },
    teamRequest: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    jobPost: { findMany: vi.fn() },
  },
}));

import { activityService } from "../activity.service";
import { prisma } from "../../../../app/lib/prisma";

const mockPrisma = vi.mocked(prisma);

const t1 = new Date("2025-01-01T10:00:00Z");
const t2 = new Date("2025-01-01T11:00:00Z");
const t3 = new Date("2025-01-01T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.resource.findMany.mockResolvedValue([]);
  mockPrisma.discussion.findMany.mockResolvedValue([]);
  mockPrisma.discussionReply.findMany.mockResolvedValue([]);
  mockPrisma.question.findMany.mockResolvedValue([]);
  mockPrisma.answer.findMany.mockResolvedValue([]);
  mockPrisma.teamRequest.findMany.mockResolvedValue([]);
  mockPrisma.event.findMany.mockResolvedValue([]);
  mockPrisma.jobPost.findMany.mockResolvedValue([]);
});

describe("activityService.listActivities", () => {
  it("queries every source when no type filter is given", async () => {
    const result = await activityService.listActivities({});

    expect(mockPrisma.resource.findMany).toHaveBeenCalled();
    expect(mockPrisma.discussion.findMany).toHaveBeenCalled();
    expect(mockPrisma.discussionReply.findMany).toHaveBeenCalled();
    expect(mockPrisma.question.findMany).toHaveBeenCalled();
    expect(mockPrisma.answer.findMany).toHaveBeenCalled();
    expect(mockPrisma.teamRequest.findMany).toHaveBeenCalled();
    expect(mockPrisma.event.findMany).toHaveBeenCalled();
    expect(mockPrisma.jobPost.findMany).toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("merges sources and sorts by timestamp descending", async () => {
    mockPrisma.resource.findMany.mockResolvedValue([
      {
        id: "res-1",
        title: "Algorithms Notes",
        uploader: { id: "u1", name: "Alice", image: null },
        course: { code: "CSE 101" },
        createdAt: t1,
      },
    ]);
    mockPrisma.discussion.findMany.mockResolvedValue([
      {
        id: "disc-1",
        title: "Study group?",
        author: { id: "u2", name: "Bob", image: null },
        createdAt: t3,
      },
    ]);

    const result = await activityService.listActivities({ limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe("discussion:disc-1");
    expect(result.items[0].type).toBe("discussion");
    expect(result.items[0].action).toBe("started a discussion");
    expect(result.items[1].id).toBe("resource:res-1");
    expect(result.items[1].type).toBe("resource");
    expect(result.items[1].action).toBe("uploaded a resource");
    expect(result.nextCursor).toBe(result.items[1].timestamp);
    expect(result.hasMore).toBe(false);
  });

  it("maps reply, question, answer, team, event and job items", async () => {
    mockPrisma.discussionReply.findMany.mockResolvedValue([
      {
        id: "reply-1",
        author: { id: "u3", name: "Carol", image: null },
        discussion: { id: "disc-1", title: "Study group?" },
        createdAt: t2,
      },
    ]);
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: "q-1",
        title: "How does Prisma work?",
        author: { id: "u4", name: "Dave", image: null },
        createdAt: t2,
      },
    ]);
    mockPrisma.answer.findMany.mockResolvedValue([
      {
        id: "a-1",
        author: { id: "u5", name: "Eve", image: null },
        question: { id: "q-1", title: "How does Prisma work?" },
        createdAt: t2,
      },
    ]);
    mockPrisma.teamRequest.findMany.mockResolvedValue([
      {
        id: "team-1",
        title: "Hackathon crew",
        creator: { id: "u6", name: "Frank", image: null },
        createdAt: t2,
      },
    ]);
    mockPrisma.event.findMany.mockResolvedValue([
      {
        id: "ev-1",
        title: "Coding Bootcamp",
        organizer: { id: "u7", name: "Grace", image: null },
        createdAt: t2,
      },
    ]);
    mockPrisma.jobPost.findMany.mockResolvedValue([
      {
        id: "job-1",
        title: "Intern at TechCorp",
        postedBy: { id: "u8", name: "Henry", image: null },
        createdAt: t2,
      },
    ]);

    const result = await activityService.listActivities({ limit: 10 });

    const byId = Object.fromEntries(result.items.map((i) => [i.id, i]));
    expect(byId["reply:reply-1"].action).toBe("replied to a discussion");
    expect(byId["question:q-1"].action).toBe("asked a question");
    expect(byId["answer:a-1"].action).toBe("answered a question");
    expect(byId["team:team-1"].action).toBe("is looking for teammates");
    expect(byId["event:ev-1"].action).toBe("announced an event");
    expect(byId["job:job-1"].action).toBe("posted a job");
  });

  it("handles an event with no organizer", async () => {
    mockPrisma.event.findMany.mockResolvedValue([
      {
        id: "ev-2",
        title: "Anonymous Event",
        organizer: null,
        createdAt: t2,
      },
    ]);

    const result = await activityService.listActivities({ type: "event" });

    expect(result.items[0].actor).toBeNull();
    expect(result.items[0].action).toBe("New event announced");
  });

  it("only queries the requested type", async () => {
    await activityService.listActivities({ type: "resource" });

    expect(mockPrisma.resource.findMany).toHaveBeenCalled();
    expect(mockPrisma.discussion.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.jobPost.findMany).not.toHaveBeenCalled();
  });

  it("clamps the limit between 1 and 50", async () => {
    await activityService.listActivities({ limit: 0 });
    await activityService.listActivities({ limit: 9999 });

    const first = mockPrisma.resource.findMany.mock.calls[0][0];
    const second = mockPrisma.resource.findMany.mock.calls[1][0];
    expect(first.take).toBe(1);
    expect(second.take).toBe(50);
  });

  it("applies a cursor time filter when provided", async () => {
    await activityService.listActivities({
      cursor: "2025-01-01T10:30:00Z",
      type: "resource",
    });

    expect(mockPrisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { lt: new Date("2025-01-01T10:30:00Z") },
        }),
      }),
    );
  });

  it("reports hasMore when any source returns a full page", async () => {
    mockPrisma.resource.findMany.mockResolvedValue([
      { id: "r1", title: "A", uploader: null, course: null, createdAt: t1 },
      { id: "r2", title: "B", uploader: null, course: null, createdAt: t1 },
    ]);

    const result = await activityService.listActivities({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
  });

  it("truncates the merged page to the limit", async () => {
    mockPrisma.resource.findMany.mockResolvedValue([
      { id: "r1", title: "A", uploader: null, course: null, createdAt: t1 },
      { id: "r2", title: "B", uploader: null, course: null, createdAt: t2 },
    ]);
    mockPrisma.discussion.findMany.mockResolvedValue([
      { id: "d1", title: "C", author: null, createdAt: t3 },
    ]);

    const result = await activityService.listActivities({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe(result.items[1].timestamp);
  });
});
