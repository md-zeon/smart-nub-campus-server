import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { resourceService } from "./resource.service";
import { ListResourcesQuery } from "./resource.interface";

const createResource = catchAsync(async (req, res) => {
  const result = await resourceService.createResource(req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Resource created successfully.",
    data: result,
  });
});

const getResourceById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await resourceService.getResourceById(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Resource retrieved successfully.",
    data: result,
  });
});

const listResources = catchAsync(async (req, res) => {
  const query: ListResourcesQuery = {
    courseId: req.query.courseId as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
    tag: req.query.tag as string | undefined,
    search: req.query.search as string | undefined,
    sort: (req.query.sort as ListResourcesQuery["sort"]) || "newest",
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 12,
  };

  const result = await resourceService.listResources(query, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Resources retrieved successfully.",
    data: result,
  });
});

const updateResource = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await resourceService.updateResource(id, req.body, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Resource updated successfully.",
    data: result,
  });
});

const deleteResource = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await resourceService.deleteResource(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const toggleVote = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const { type } = req.body;
  const result = await resourceService.toggleVote(id, req.user.id, type);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Vote ${result.action} successfully.`,
    data: result,
  });
});

const toggleBookmark = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await resourceService.toggleBookmark(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Bookmark ${result.action} successfully.`,
    data: result,
  });
});

const trackDownload = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await resourceService.trackDownload(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Download tracked successfully.",
    data: result,
  });
});

const addComment = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await resourceService.addComment(id, req.user.id, req.body);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Comment added successfully.",
    data: result,
  });
});

const getComments = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await resourceService.getComments(id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Comments retrieved successfully.",
    data: result,
  });
});

const deleteComment = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await resourceService.deleteComment(id, req.user.id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const reportResource = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const { reason, description } = req.body;
  const result = await resourceService.reportResource(
    id,
    req.user.id,
    reason,
    description,
  );
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: result.message,
    data: null,
  });
});

const getReports = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await resourceService.getReports(page, limit);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reports retrieved successfully.",
    data: result,
  });
});

const reviewReport = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await resourceService.reviewReport(
    id,
    req.user.id,
    req.body.status,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Report reviewed successfully.",
    data: result,
  });
});

export const resourceController = {
  createResource,
  getResourceById,
  listResources,
  updateResource,
  deleteResource,
  toggleVote,
  toggleBookmark,
  trackDownload,
  addComment,
  getComments,
  deleteComment,
  reportResource,
  getReports,
  reviewReport,
};
