import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { adminService } from "./admin.service";
import { ListUsersQuery, ListResourcesQuery, ListAuditLogsQuery } from "./admin.interface";

// --- Dashboard Stats ---
const getDashboardStats = catchAsync(async (req, res) => {
  const result = await adminService.getDashboardStats();

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "VIEW_DASHBOARD",
    targetType: "SYSTEM",
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Dashboard stats retrieved successfully.",
    data: result,
  });
});

// --- User Management ---
const listUsers = catchAsync(async (req, res) => {
  const query: ListUsersQuery = {
    search: req.query.search as string | undefined,
    role: req.query.role as string | undefined,
    status: req.query.status as ListUsersQuery["status"],
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const result = await adminService.listUsers(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Users retrieved successfully.",
    data: result,
  });
});

const getUserById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.getUserById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User retrieved successfully.",
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const { status: newStatus } = req.body;

  const result = await adminService.updateUserStatus(id, newStatus);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "UPDATE_USER_STATUS",
    targetType: "USER",
    targetId: id,
    details: { newStatus },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `User status updated to ${newStatus}.`,
    data: result,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.deleteUser(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "DELETE_USER",
    targetType: "USER",
    targetId: id,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// --- Resource Management ---
const listResources = catchAsync(async (req, res) => {
  const query: ListResourcesQuery = {
    search: req.query.search as string | undefined,
    courseId: req.query.courseId as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
    isVerified:
      req.query.isVerified !== undefined
        ? req.query.isVerified === "true"
        : undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const result = await adminService.listResources(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Resources retrieved successfully.",
    data: result,
  });
});

const verifyResource = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const { isVerified } = req.body;

  const result = await adminService.verifyResource(id, isVerified);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: isVerified ? "VERIFY_RESOURCE" : "UNVERIFY_RESOURCE",
    targetType: "RESOURCE",
    targetId: id,
    details: { isVerified },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Resource ${isVerified ? "verified" : "unverified"} successfully.`,
    data: result,
  });
});

const deleteResource = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.deleteResource(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "DELETE_RESOURCE",
    targetType: "RESOURCE",
    targetId: id,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// --- Course Management ---
const listCourses = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await adminService.listCourses(page, limit);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Courses retrieved successfully.",
    data: result,
  });
});

const getCourseById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.getCourseById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Course retrieved successfully.",
    data: result,
  });
});

const createCourse = catchAsync(async (req, res) => {
  const result = await adminService.createCourse(req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "CREATE_COURSE",
    targetType: "COURSE",
    targetId: result.id,
    details: { code: result.code, name: result.name },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Course created successfully.",
    data: result,
  });
});

const updateCourse = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.updateCourse(id, req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "UPDATE_COURSE",
    targetType: "COURSE",
    targetId: id,
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Course updated successfully.",
    data: result,
  });
});

const deleteCourse = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.deleteCourse(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "DELETE_COURSE",
    targetType: "COURSE",
    targetId: id,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// --- Resource Category Management ---
const listResourceCategories = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const result = await adminService.listResourceCategories(page, limit);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Resource categories retrieved successfully.",
    data: result,
  });
});

const getResourceCategoryById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.getResourceCategoryById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Resource category retrieved successfully.",
    data: result,
  });
});

const createResourceCategory = catchAsync(async (req, res) => {
  const result = await adminService.createResourceCategory(req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "CREATE_RESOURCE_CATEGORY",
    targetType: "RESOURCE_CATEGORY",
    targetId: result.id,
    details: { name: result.name },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Resource category created successfully.",
    data: result,
  });
});

const updateResourceCategory = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.updateResourceCategory(id, req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "UPDATE_RESOURCE_CATEGORY",
    targetType: "RESOURCE_CATEGORY",
    targetId: id,
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Resource category updated successfully.",
    data: result,
  });
});

const deleteResourceCategory = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.deleteResourceCategory(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "DELETE_RESOURCE_CATEGORY",
    targetType: "RESOURCE_CATEGORY",
    targetId: id,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// --- Discussion Category Management ---
const listDiscussionCategories = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const result = await adminService.listDiscussionCategories(page, limit);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussion categories retrieved successfully.",
    data: result,
  });
});

const getDiscussionCategoryById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.getDiscussionCategoryById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussion category retrieved successfully.",
    data: result,
  });
});

const createDiscussionCategory = catchAsync(async (req, res) => {
  const result = await adminService.createDiscussionCategory(req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "CREATE_DISCUSSION_CATEGORY",
    targetType: "DISCUSSION_CATEGORY",
    targetId: result.id,
    details: { name: result.name },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Discussion category created successfully.",
    data: result,
  });
});

const updateDiscussionCategory = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.updateDiscussionCategory(id, req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "UPDATE_DISCUSSION_CATEGORY",
    targetType: "DISCUSSION_CATEGORY",
    targetId: id,
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussion category updated successfully.",
    data: result,
  });
});

const deleteDiscussionCategory = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.deleteDiscussionCategory(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "DELETE_DISCUSSION_CATEGORY",
    targetType: "DISCUSSION_CATEGORY",
    targetId: id,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// --- Question Category Management ---
const listQuestionCategories = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const result = await adminService.listQuestionCategories(page, limit);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Question categories retrieved successfully.",
    data: result,
  });
});

const getQuestionCategoryById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.getQuestionCategoryById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Question category retrieved successfully.",
    data: result,
  });
});

const createQuestionCategory = catchAsync(async (req, res) => {
  const result = await adminService.createQuestionCategory(req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "CREATE_QUESTION_CATEGORY",
    targetType: "QUESTION_CATEGORY",
    targetId: result.id,
    details: { name: result.name },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Question category created successfully.",
    data: result,
  });
});

const updateQuestionCategory = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.updateQuestionCategory(id, req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "UPDATE_QUESTION_CATEGORY",
    targetType: "QUESTION_CATEGORY",
    targetId: id,
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Question category updated successfully.",
    data: result,
  });
});

const deleteQuestionCategory = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.deleteQuestionCategory(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "DELETE_QUESTION_CATEGORY",
    targetType: "QUESTION_CATEGORY",
    targetId: id,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// --- Event Management ---
const listEvents = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await adminService.listEvents(page, limit);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Events retrieved successfully.",
    data: result,
  });
});

const getEventById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.getEventById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event retrieved successfully.",
    data: result,
  });
});

const createEvent = catchAsync(async (req, res) => {
  const result = await adminService.createEvent(req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "CREATE_EVENT",
    targetType: "EVENT",
    targetId: result.id,
    details: { title: result.title },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Event created successfully.",
    data: result,
  });
});

const updateEvent = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.updateEvent(id, req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "UPDATE_EVENT",
    targetType: "EVENT",
    targetId: id,
    details: req.body,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Event updated successfully.",
    data: result,
  });
});

const deleteEvent = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.deleteEvent(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "DELETE_EVENT",
    targetType: "EVENT",
    targetId: id,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

// --- Audit Log ---
const listAuditLogs = catchAsync(async (req, res) => {
  const query: ListAuditLogsQuery = {
    adminUserId: req.query.adminUserId as string | undefined,
    action: req.query.action as string | undefined,
    targetType: req.query.targetType as string | undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const result = await adminService.listAuditLogs(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Audit logs retrieved successfully.",
    data: result,
  });
});

const getAuditLogById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.getAuditLogById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Audit log entry retrieved successfully.",
    data: result,
  });
});

export const adminController = {
  getDashboardStats,
  listUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  listResources,
  verifyResource,
  deleteResource,
  listCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  listResourceCategories,
  getResourceCategoryById,
  createResourceCategory,
  updateResourceCategory,
  deleteResourceCategory,
  listDiscussionCategories,
  getDiscussionCategoryById,
  createDiscussionCategory,
  updateDiscussionCategory,
  deleteDiscussionCategory,
  listQuestionCategories,
  getQuestionCategoryById,
  createQuestionCategory,
  updateQuestionCategory,
  deleteQuestionCategory,
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  listAuditLogs,
  getAuditLogById,
};
