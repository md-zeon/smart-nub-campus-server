import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { getSocketServer } from "../../lib/socket/socket-server";
import { notificationService } from "../notification/notification.service";
import {
  CreateEventInput,
  UpdateEventInput,
  ListEventsQuery,
} from "./event.interface";

/**
 * Create a new event. If organizerId is provided, links the event to that user.
 */
const createEvent = async (data: CreateEventInput, userId: string) => {
  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      eventDate: new Date(data.eventDate),
      location: data.location ?? null,
      imageUrl: data.imageUrl ?? null,
      organizerId: data.organizerId ?? userId,
      status: data.status ?? "UPCOMING",
      isFeatured: data.isFeatured ?? false,
    },
    include: {
      organizer: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: { select: { rsvps: true } },
    },
  });

  try {
    const io = getSocketServer();
    io.emit("event:new", {
      id: event.id,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate.toISOString(),
      location: event.location,
      imageUrl: event.imageUrl,
      status: event.status,
      isFeatured: event.isFeatured,
    });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  return event;
};

/**
 * Get a single event by ID with RSVP count and user RSVP status.
 */
const getEventById = async (id: string, userId?: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: { select: { rsvps: true } },
    },
  });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found.");
  }

  let isRsvpd = false;

  if (userId) {
    const rsvp = await prisma.eventRSVP.findUnique({
      where: { eventId_userId: { eventId: id, userId } },
      select: { id: true },
    });
    isRsvpd = !!rsvp;
  }

  return { ...event, isRsvpd };
};

/**
 * List events with optional filters (status, search, date range, featured).
 */
const listEvents = async (query: ListEventsQuery, userId?: string) => {
  const {
    status: eventStatus,
    search,
    upcoming,
    featured,
    page = 1,
    limit = 12,
  } = query;

  const skip = (page - 1) * limit;
  const take = limit;

  const where: Record<string, unknown> = {};

  if (eventStatus) {
    where.status = eventStatus;
  }

  if (upcoming) {
    where.status = "UPCOMING";
    where.eventDate = { gte: new Date() };
  }

  if (featured) {
    where.isFeatured = true;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      skip,
      take,
      orderBy: { eventDate: "desc" },
      include: {
        organizer: {
          select: { id: true, name: true, image: true },
        },
        _count: { select: { rsvps: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  let eventsWithUserState = events;

  if (userId) {
    const eventIds = events.map((e) => e.id);

    const rsvps = await prisma.eventRSVP.findMany({
      where: { eventId: { in: eventIds }, userId },
      select: { eventId: true },
    });

    const rsvpSet = new Set(rsvps.map((r) => r.eventId));

    eventsWithUserState = events.map((e) => ({
      ...e,
      isRsvpd: rsvpSet.has(e.id),
    }));
  }

  return {
    data: eventsWithUserState,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Fetch upcoming events for homepage display. Returns featured events first, then by date.
 */
const getUpcomingEvents = async (userId?: string) => {
  const events = await prisma.event.findMany({
    where: {
      status: "UPCOMING",
      eventDate: { gte: new Date() },
    },
    take: 6,
    orderBy: [{ isFeatured: "desc" }, { eventDate: "asc" }],
    include: {
      organizer: {
        select: { id: true, name: true, image: true },
      },
      _count: { select: { rsvps: true } },
    },
  });

  let eventsWithUserState = events;

  if (userId) {
    const eventIds = events.map((e) => e.id);

    const rsvps = await prisma.eventRSVP.findMany({
      where: { eventId: { in: eventIds }, userId },
      select: { eventId: true },
    });

    const rsvpSet = new Set(rsvps.map((r) => r.eventId));

    eventsWithUserState = events.map((e) => ({
      ...e,
      isRsvpd: rsvpSet.has(e.id),
    }));
  }

  return eventsWithUserState;
};

/**
 * Update event details, status, or featured flag. Only the organizer or admin can update.
 */
const updateEvent = async (
  id: string,
  data: UpdateEventInput,
  userId: string,
  isAdmin: boolean,
) => {
  const existing = await prisma.event.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Event not found.");
  }

  if (!isAdmin && existing.organizerId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only update events you organized.",
    );
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.eventDate !== undefined) updateData.eventDate = new Date(data.eventDate);
  if (data.location !== undefined) updateData.location = data.location;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;

  const updated = await prisma.event.update({
    where: { id },
    data: updateData,
    include: {
      organizer: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: { select: { rsvps: true } },
    },
  });

  return updated;
};

/**
 * Hard-delete an event. Only the organizer or admin can delete.
 */
const deleteEvent = async (id: string, userId: string, isAdmin: boolean) => {
  const existing = await prisma.event.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Event not found.");
  }

  if (!isAdmin && existing.organizerId !== userId) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete events you organized.",
    );
  }

  await prisma.event.delete({ where: { id } });

  return { message: "Event deleted successfully." };
};

/**
 * Toggle RSVP for an event. Creates or removes the RSVP record.
 */
const toggleRsvp = async (eventId: string, userId: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    throw new AppError(status.NOT_FOUND, "Event not found.");
  }

  const existingRsvp = await prisma.eventRSVP.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  if (existingRsvp) {
    await prisma.eventRSVP.delete({ where: { id: existingRsvp.id } });

    try {
      const io = getSocketServer();
      io.emit("event:rsvpUpdate", { eventId, action: "removed" as const });
    } catch {
      // Socket.IO may not be initialized in test environments
    }

    return { action: "removed" as const };
  }

  await prisma.eventRSVP.create({
    data: { eventId, userId },
  });

  try {
    const io = getSocketServer();
    io.emit("event:rsvpUpdate", { eventId, action: "added" as const });
  } catch {
    // Socket.IO may not be initialized in test environments
  }

  // Notify event organizer (skip self-RSVP)
  if (event.organizerId && event.organizerId !== userId) {
    try {
      await notificationService.createNotification({
        userId: event.organizerId,
        type: "EVENT_REMINDER",
        title: "New RSVP",
        message: `Someone RSVP'd to your event "${event.title}".`,
        link: `/events/${eventId}`,
      });
    } catch {
      // Notification failure is non-critical
    }
  }

  return { action: "added" as const };
};

export const eventService = {
  createEvent,
  getEventById,
  listEvents,
  getUpcomingEvents,
  updateEvent,
  deleteEvent,
  toggleRsvp,
};
