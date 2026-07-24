import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../../../app/lib/prisma", () => ({
  prisma: {
    event: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    eventCategory: {
      findMany: vi.fn(),
    },
    eventRSVP: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (fns: any) => {
      if (Array.isArray(fns)) {
        return Promise.all(fns);
      }
      return fns((...args: any[]) => args[args.length - 1]);
    }),
  },
}));

import { eventService } from "../event.service";
import { prisma } from "../../../../app/lib/prisma";

const mockedPrisma = vi.mocked(prisma);

const userId = "user-001";
const otherUserId = "user-002";
const eventId = "event-001";

afterEach(() => {
  vi.clearAllMocks();
});

// ─── createEvent ────────────────────────────────────────────────────────────

describe("createEvent", () => {
  it("creates an event with organizer", async () => {
    const mockEvent = {
      id: eventId,
      title: "Tech Talk",
      description: "A tech talk about AI",
      eventDate: new Date("2025-06-01"),
      location: "Hall A",
      imageUrl: null,
      organizerId: userId,
      status: "UPCOMING",
      isFeatured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      organizer: {
        id: userId,
        name: "Alice",
        email: "alice@test.com",
        image: null,
      },
      _count: { rsvps: 0 },
    };
    (mockedPrisma.event.create as any).mockResolvedValue(mockEvent);

    const result = await eventService.createEvent(
      { title: "Tech Talk", eventDate: "2025-06-01" },
      userId,
    );

    expect(result.title).toBe("Tech Talk");
    expect(result.organizerId).toBe(userId);
    expect(mockedPrisma.event.create).toHaveBeenCalledOnce();
    expect(mockedPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Tech Talk",
          organizerId: userId,
          status: "UPCOMING",
          isFeatured: false,
        }),
      }),
    );
  });

  it("uses provided organizerId over userId", async () => {
    (mockedPrisma.event.create as any).mockResolvedValue({
      id: eventId,
      organizerId: otherUserId,
    });

    await eventService.createEvent(
      { title: "Workshop", eventDate: "2025-07-01", organizerId: otherUserId },
      userId,
    );

    expect(mockedPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizerId: otherUserId }),
      }),
    );
  });

  it("applies optional fields when provided", async () => {
    (mockedPrisma.event.create as any).mockResolvedValue({ id: eventId });

    await eventService.createEvent(
      {
        title: "Hackathon",
        eventDate: "2025-08-01",
        description: "48hr hackathon",
        location: "Lab B",
        imageUrl: "https://img.test/event.png",
        status: "ONGOING",
        isFeatured: true,
      },
      userId,
    );

    expect(mockedPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "48hr hackathon",
          location: "Lab B",
          imageUrl: "https://img.test/event.png",
          status: "ONGOING",
          isFeatured: true,
        }),
      }),
    );
  });

  it("sets null for omitted optional fields", async () => {
    (mockedPrisma.event.create as any).mockResolvedValue({ id: eventId });

    await eventService.createEvent({ title: "Meetup", eventDate: "2025-09-01" }, userId);

    expect(mockedPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: null,
          location: null,
          imageUrl: null,
        }),
      }),
    );
  });
});

// ─── getEventById ───────────────────────────────────────────────────────────

describe("getEventById", () => {
  it("returns event with isRsvpd true when user has RSVP'd", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      title: "Tech Talk",
      organizer: { id: userId, name: "Alice", email: "alice@test.com", image: null },
      _count: { rsvps: 5 },
    });
    (mockedPrisma.eventRSVP.findUnique as any).mockResolvedValue({ id: "rsvp-1" });

    const result = await eventService.getEventById(eventId, userId);

    expect(result.id).toBe(eventId);
    expect(result.isRsvpd).toBe(true);
    expect(result._count.rsvps).toBe(5);
  });

  it("returns event with isRsvpd false when user has not RSVP'd", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizer: { id: userId, name: "Alice", email: "alice@test.com", image: null },
      _count: { rsvps: 0 },
    });
    (mockedPrisma.eventRSVP.findUnique as any).mockResolvedValue(null);

    const result = await eventService.getEventById(eventId, userId);

    expect(result.isRsvpd).toBe(false);
  });

  it("returns event without RSVP check when no userId provided", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizer: { id: userId, name: "Alice", email: "alice@test.com", image: null },
      _count: { rsvps: 3 },
    });

    const result = await eventService.getEventById(eventId);

    expect(result.isRsvpd).toBe(false);
    expect(mockedPrisma.eventRSVP.findUnique).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when event does not exist", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue(null);

    await expect(eventService.getEventById("nonexistent")).rejects.toThrow(
      "Event not found.",
    );
  });

  it("queries RSVP with correct compound key", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizer: { id: userId },
      _count: { rsvps: 0 },
    });
    (mockedPrisma.eventRSVP.findUnique as any).mockResolvedValue(null);

    await eventService.getEventById(eventId, userId);

    expect(mockedPrisma.eventRSVP.findUnique).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true },
    });
  });
});

// ─── listEvents ─────────────────────────────────────────────────────────────

describe("listEvents", () => {
  it("returns paginated events with default params", async () => {
    const mockEvents = [
      {
        id: eventId,
        title: "Tech Talk",
        organizer: { id: userId, name: "Alice", image: null },
        _count: { rsvps: 2 },
      },
    ];
    (mockedPrisma.$transaction as any).mockResolvedValue([mockEvents, 1]);

    const result = await eventService.listEvents({});

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual(
      expect.objectContaining({ page: 1, limit: 12, total: 1, totalPages: 1 }),
    );
    expect(result.data[0].id).toBe(eventId);
  });

  it("enriches results with user RSVP state", async () => {
    const mockEvents = [
      { id: eventId, title: "Tech Talk", organizer: { id: userId, name: "Alice", image: null }, _count: { rsvps: 2 } },
      { id: "event-002", title: "Workshop", organizer: { id: otherUserId, name: "Bob", image: null }, _count: { rsvps: 0 } },
    ];
    (mockedPrisma.$transaction as any).mockResolvedValue([mockEvents, 2]);
    (mockedPrisma.eventRSVP.findMany as any).mockResolvedValue([{ eventId }]);

    const result = await eventService.listEvents({}, userId);

    expect(result.data[0].isRsvpd).toBe(true);
    expect(result.data[1].isRsvpd).toBe(false);
  });

  it("does not query RSVPs when no userId", async () => {
    (mockedPrisma.$transaction as any).mockResolvedValue([[], 0]);

    await eventService.listEvents({});

    expect(mockedPrisma.eventRSVP.findMany).not.toHaveBeenCalled();
  });

  it("applies upcoming filter", async () => {
    (mockedPrisma.$transaction as any).mockResolvedValue([[], 0]);

    await eventService.listEvents({ upcoming: true });

    expect(mockedPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "UPCOMING",
          eventDate: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );
  });

  it("applies status filter", async () => {
    (mockedPrisma.$transaction as any).mockResolvedValue([[], 0]);

    await eventService.listEvents({ status: "ONGOING" });

    expect(mockedPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ONGOING" }),
      }),
    );
  });

  it("applies featured filter", async () => {
    (mockedPrisma.$transaction as any).mockResolvedValue([[], 0]);

    await eventService.listEvents({ featured: true });

    expect(mockedPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isFeatured: true }),
      }),
    );
  });

  it("applies search filter across title, description, location", async () => {
    (mockedPrisma.$transaction as any).mockResolvedValue([[], 0]);

    await eventService.listEvents({ search: "hackathon" });

    expect(mockedPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { title: { contains: "hackathon", mode: "insensitive" } },
            { description: { contains: "hackathon", mode: "insensitive" } },
            { location: { contains: "hackathon", mode: "insensitive" } },
          ],
        }),
      }),
    );
  });

  it("applies custom page and limit", async () => {
    (mockedPrisma.$transaction as any).mockResolvedValue([[], 0]);

    const result = await eventService.listEvents({ page: 2, limit: 5 });

    expect(mockedPrisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
  });

  it("calculates total pages correctly", async () => {
    (mockedPrisma.$transaction as any).mockResolvedValue([[], 25]);

    const result = await eventService.listEvents({ page: 1, limit: 10 });

    expect(result.meta.totalPages).toBe(3);
  });
});

// ─── updateEvent ────────────────────────────────────────────────────────────

describe("updateEvent", () => {
  it("updates own event as organizer", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizerId: userId,
    });
    (mockedPrisma.event.update as any).mockResolvedValue({
      id: eventId,
      title: "Updated Talk",
      organizer: { id: userId, name: "Alice", email: "alice@test.com", image: null },
      _count: { rsvps: 0 },
    });

    const result = await eventService.updateEvent(
      eventId,
      { title: "Updated Talk" },
      userId,
      false,
    );

    expect(result.title).toBe("Updated Talk");
    expect(mockedPrisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Updated Talk" }),
      }),
    );
  });

  it("allows admin to update any event", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizerId: otherUserId,
    });
    (mockedPrisma.event.update as any).mockResolvedValue({
      id: eventId,
      title: "Admin Update",
      organizer: { id: otherUserId },
      _count: { rsvps: 0 },
    });

    const result = await eventService.updateEvent(
      eventId,
      { title: "Admin Update" },
      userId,
      true,
    );

    expect(result.title).toBe("Admin Update");
  });

  it("updates only provided fields", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizerId: userId,
    });
    (mockedPrisma.event.update as any).mockResolvedValue({ id: eventId });

    await eventService.updateEvent(eventId, { location: "New Hall" }, userId, false);

    expect(mockedPrisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ location: "New Hall" }),
      }),
    );
    expect(mockedPrisma.event.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: expect.anything() }),
      }),
    );
  });

  it("converts eventDate string to Date", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizerId: userId,
    });
    (mockedPrisma.event.update as any).mockResolvedValue({ id: eventId });

    await eventService.updateEvent(
      eventId,
      { eventDate: "2025-12-25" },
      userId,
      false,
    );

    expect(mockedPrisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventDate: new Date("2025-12-25"),
        }),
      }),
    );
  });

  it("throws NOT_FOUND when event does not exist", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue(null);

    await expect(
      eventService.updateEvent("nonexistent", { title: "Updated" }, userId, false),
    ).rejects.toThrow("Event not found.");
  });

  it("throws FORBIDDEN when user is not the organizer and not admin", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizerId: otherUserId,
    });

    await expect(
      eventService.updateEvent(eventId, { title: "Hacked" }, userId, false),
    ).rejects.toThrow("You can only update events you organized.");
  });
});

// ─── deleteEvent ────────────────────────────────────────────────────────────

describe("deleteEvent", () => {
  it("deletes own event as organizer", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizerId: userId,
    });
    (mockedPrisma.event.delete as any).mockResolvedValue({});

    const result = await eventService.deleteEvent(eventId, userId, false);

    expect(result.message).toBe("Event deleted successfully.");
    expect(mockedPrisma.event.delete).toHaveBeenCalledWith({ where: { id: eventId } });
  });

  it("allows admin to delete any event", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizerId: otherUserId,
    });
    (mockedPrisma.event.delete as any).mockResolvedValue({});

    const result = await eventService.deleteEvent(eventId, userId, true);

    expect(result.message).toBe("Event deleted successfully.");
    expect(mockedPrisma.event.delete).toHaveBeenCalledWith({ where: { id: eventId } });
  });

  it("throws NOT_FOUND when event does not exist", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue(null);

    await expect(
      eventService.deleteEvent("nonexistent", userId, false),
    ).rejects.toThrow("Event not found.");
  });

  it("throws FORBIDDEN when user is not the organizer and not admin", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizerId: otherUserId,
    });

    await expect(
      eventService.deleteEvent(eventId, userId, false),
    ).rejects.toThrow("You can only delete events you organized.");
  });

  it("does not call delete when authorization fails", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({
      id: eventId,
      organizerId: otherUserId,
    });

    await expect(
      eventService.deleteEvent(eventId, userId, false),
    ).rejects.toThrow();

    expect(mockedPrisma.event.delete).not.toHaveBeenCalled();
  });
});

// ─── toggleRsvp ─────────────────────────────────────────────────────────────

describe("toggleRsvp", () => {
  it("adds RSVP when none exists", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({ id: eventId });
    (mockedPrisma.eventRSVP.findUnique as any).mockResolvedValue(null);
    (mockedPrisma.eventRSVP.create as any).mockResolvedValue({
      id: "rsvp-1",
      eventId,
      userId,
    });

    const result = await eventService.toggleRsvp(eventId, userId);

    expect(result.action).toBe("added");
    expect(mockedPrisma.eventRSVP.create).toHaveBeenCalledWith({
      data: { eventId, userId },
    });
  });

  it("removes RSVP when one already exists", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({ id: eventId });
    (mockedPrisma.eventRSVP.findUnique as any).mockResolvedValue({
      id: "rsvp-1",
      eventId,
      userId,
    });
    (mockedPrisma.eventRSVP.delete as any).mockResolvedValue({});

    const result = await eventService.toggleRsvp(eventId, userId);

    expect(result.action).toBe("removed");
    expect(mockedPrisma.eventRSVP.delete).toHaveBeenCalledWith({
      where: { id: "rsvp-1" },
    });
  });

  it("throws NOT_FOUND when event does not exist", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue(null);

    await expect(
      eventService.toggleRsvp("nonexistent", userId),
    ).rejects.toThrow("Event not found.");
  });

  it("queries RSVP with correct compound key", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue({ id: eventId });
    (mockedPrisma.eventRSVP.findUnique as any).mockResolvedValue(null);
    (mockedPrisma.eventRSVP.create as any).mockResolvedValue({});

    await eventService.toggleRsvp(eventId, userId);

    expect(mockedPrisma.eventRSVP.findUnique).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId, userId } },
    });
  });

  it("does not create RSVP when event is not found", async () => {
    (mockedPrisma.event.findUnique as any).mockResolvedValue(null);

    await expect(
      eventService.toggleRsvp(eventId, userId),
    ).rejects.toThrow("Event not found.");

    expect(mockedPrisma.eventRSVP.create).not.toHaveBeenCalled();
    expect(mockedPrisma.eventRSVP.delete).not.toHaveBeenCalled();
  });
});
