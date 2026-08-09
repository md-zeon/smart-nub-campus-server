import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { prisma } from "../../lib/prisma";
import { alumniService } from "./alumni.service";
import { DirectoryQuery } from "./alumni.interface";

const getTransitionStatus = catchAsync(async (req, res) => {
  const result = await alumniService.getTransitionStatus(req.user.id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Transition status retrieved successfully.",
    data: result,
  });
});

const transitionToAlumni = catchAsync(async (req, res) => {
  await alumniService.transitionToAlumni(req.user.id);

  const updatedUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      student: {
        select: {
          academicStatus: true,
          graduationYear: true,
          graduationSemester: true,
          graduationDate: true,
          degreeTitle: true,
          transitionConfirmedAt: true,
        },
      },
    },
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "You are now an alumnus of Northern University Bangladesh.",
    data: updatedUser,
  });
});

const listDirectory = catchAsync(async (req, res) => {
  const query: DirectoryQuery = {
    department: req.query.department as string | undefined,
    graduationYear: req.query.graduationYear
      ? parseInt(req.query.graduationYear as string)
      : undefined,
    industry: req.query.industry as string | undefined,
    location: req.query.location as string | undefined,
    q: req.query.q as string | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 12,
  };

  const result = await alumniService.listDirectory(query);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Alumni directory retrieved successfully.",
    data: result,
  });
});

const getDirectoryMember = catchAsync(async (req, res) => {
  const result = await alumniService.getDirectoryMember(
    { id: req.user.id, role: req.user.role },
    req.params.id as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Alumni member retrieved successfully.",
    data: result,
  });
});

const getDirectoryStats = catchAsync(async (req, res) => {
  const result = await alumniService.getDirectoryStats();

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Alumni directory stats retrieved successfully.",
    data: result,
  });
});

export const alumniController = {
  getTransitionStatus,
  transitionToAlumni,
  listDirectory,
  getDirectoryMember,
  getDirectoryStats,
};
