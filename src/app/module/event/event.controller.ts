import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { eventService } from "./event.service";
import { ListEventsQuery } from "./event.interface";

const createEvent = catchAsync(async (req, res) => {
  const result = await eventService.createEvent(req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Event created successfully.",
    data: result,
  });
});

const getEventById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await eventService.getEventById(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event retrieved successfully.",
    data: result,
  });
});

const listEvents = catchAsync(async (req, res) => {
  const query: ListEventsQuery = {
    status: req.query.status as ListEventsQuery["status"],
    search: req.query.search as string | undefined,
    upcoming: req.query.upcoming === "true",
    featured: req.query.featured === "true",
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 12,
  };

  const result = await eventService.listEvents(query, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Events retrieved successfully.",
    data: result,
  });
});

const getUpcomingEvents = catchAsync(async (req, res) => {
  const result = await eventService.getUpcomingEvents(req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Upcoming events retrieved successfully.",
    data: result,
  });
});

const updateEvent = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const isAdmin = req.user.role === "ADMIN";
  const result = await eventService.updateEvent(id, req.body, req.user.id, isAdmin);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event updated successfully.",
    data: result,
  });
});

const deleteEvent = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const isAdmin = req.user.role === "ADMIN";
  const result = await eventService.deleteEvent(id, req.user.id, isAdmin);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const toggleRsvp = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await eventService.toggleRsvp(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `RSVP ${result.action} successfully.`,
    data: result,
  });
});

export const eventController = {
  createEvent,
  getEventById,
  listEvents,
  getUpcomingEvents,
  updateEvent,
  deleteEvent,
  toggleRsvp,
};
