import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { activityService } from "./activity.service";
import { ActivityListQuery, ActivityType } from "./activity.interface";

const listActivities = catchAsync(async (req, res) => {
  const query: ActivityListQuery = {
    limit: parseInt(req.query.limit as string, 10) || 20,
    type: (req.query.type as ActivityType) || undefined,
    cursor: (req.query.cursor as string) || undefined,
  };

  const result = await activityService.listActivities(query);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Activities retrieved successfully.",
    data: result,
  });
});

export const activityController = {
  listActivities,
};
