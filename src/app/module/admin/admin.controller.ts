import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { adminService } from "./admin.service";
import { ListUsersQuery, ListAlumniQuery, ListResourcesQuery, ListJobsQuery, ListAuditLogsQuery, ListDiscussionsQuery, DashboardChartsQuery } from "./admin.interface";

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

// --- Dashboard Charts ---
const getDashboardCharts = catchAsync(async (req, res) => {
  const query: DashboardChartsQuery = {
    days: parseInt(req.query.days as string) || 7,
  };

  const result = await adminService.getDashboardCharts(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Dashboard charts retrieved successfully.",
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

// --- Graduation & Alumni Management ---
const markGraduation = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.markGraduation(id, req.user.id, req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "MARK_GRADUATION",
    targetType: "USER",
    targetId: id,
    details: {
      graduationYear: req.body.graduationYear,
      graduationSemester: req.body.graduationSemester,
    },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Student marked as graduated successfully.",
    data: result,
  });
});

const undoGraduation = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.undoGraduation(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "UNDO_GRADUATION",
    targetType: "USER",
    targetId: id,
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Graduation record undone successfully.",
    data: result,
  });
});

const batchGraduation = catchAsync(async (req, res) => {
  const result = await adminService.batchGraduation(req.user.id, req.body);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "BATCH_GRADUATION",
    targetType: "SYSTEM",
    details: {
      count: String(result.count),
      graduationYear: req.body.graduationYear,
      graduationSemester: req.body.graduationSemester,
    },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `${result.count} student(s) marked as graduated successfully.`,
    data: result,
  });
});

const revertAlumni = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.revertAlumni(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "REVERT_ALUMNI",
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

const listAlumni = catchAsync(async (req, res) => {
  const query: ListAlumniQuery = {
    department: req.query.department as string | undefined,
    graduationYear: req.query.graduationYear
      ? parseInt(req.query.graduationYear as string)
      : undefined,
    industry: req.query.industry as string | undefined,
    currentEmployer: req.query.currentEmployer as string | undefined,
    q: req.query.q as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const result = await adminService.listAlumni(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Alumni retrieved successfully.",
    data: result,
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

// --- Job Post Management ---
const listJobs = catchAsync(async (req, res) => {
  const query: ListJobsQuery = {
    search: req.query.search as string | undefined,
    status: req.query.status as string | undefined,
    isVerified:
      req.query.isVerified !== undefined
        ? req.query.isVerified === "true"
        : undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const result = await adminService.listJobs(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Job posts retrieved successfully.",
    data: result,
  });
});

const verifyJob = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const { isVerified } = req.body;

  const result = await adminService.verifyJob(id, isVerified);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: isVerified ? "VERIFY_JOB" : "UNVERIFY_JOB",
    targetType: "JOB",
    targetId: id,
    details: { isVerified },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Job post ${isVerified ? "verified" : "unverified"} successfully.`,
    data: result,
  });
});

const deleteJob = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.deleteJob(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "DELETE_JOB",
    targetType: "JOB",
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
  const result = await adminService.createResourceCategory(req.body) as { id: string; name: string };

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
  const result = await adminService.createDiscussionCategory(req.body) as { id: string; name: string };

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
  const result = await adminService.createQuestionCategory(req.body) as { id: string; name: string };

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

// --- Discussion Management ---
const listDiscussions = catchAsync(async (req, res) => {
  const query: ListDiscussionsQuery = {
    search: req.query.search as string | undefined,
    status: req.query.status as ListDiscussionsQuery["status"],
    sort: (req.query.sort as ListDiscussionsQuery["sort"]) || "newest",
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const result = await adminService.listDiscussions(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Discussions retrieved successfully.",
    data: result,
  });
});

const deleteDiscussion = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.deleteDiscussion(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: "DELETE_DISCUSSION",
    targetType: "DISCUSSION",
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

const togglePin = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.togglePin(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: result.isPinned ? "PIN_DISCUSSION" : "UNPIN_DISCUSSION",
    targetType: "DISCUSSION",
    targetId: id,
    details: { isPinned: result.isPinned },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Discussion ${result.isPinned ? "pinned" : "unpinned"} successfully.`,
    data: result,
  });
});

const toggleLock = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await adminService.toggleLock(id);

  await adminService.createAuditLog({
    adminUserId: req.user.id,
    action: result.isLocked ? "LOCK_DISCUSSION" : "UNLOCK_DISCUSSION",
    targetType: "DISCUSSION",
    targetId: id,
    details: { isLocked: result.isLocked },
    ipAddress: req.ip,
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Discussion ${result.isLocked ? "locked" : "unlocked"} successfully.`,
    data: result,
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
  getDashboardCharts,
  listUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  markGraduation,
  undoGraduation,
  batchGraduation,
  revertAlumni,
  listAlumni,
  listResources,
  verifyResource,
  deleteResource,
  listJobs,
  verifyJob,
  deleteJob,
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
  listDiscussions,
  deleteDiscussion,
  togglePin,
  toggleLock,
  listAuditLogs,
  getAuditLogById,
};
