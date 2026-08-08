import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { courseService } from "./course.service";

const getCourse = catchAsync(async (req, res) => {
  const id = req.params.id as string;

  const course = await courseService.getCourseById(id);

  if (!course) {
    return sendResponse(res, {
      httpStatusCode: status.NOT_FOUND,
      success: false,
      message: "Course not found.",
      data: null,
    });
  }

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Course retrieved successfully.",
    data: course,
  });
});

export const courseController = {
  getCourse,
};
