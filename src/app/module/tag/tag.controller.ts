import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { tagService } from "./tag.service";

const listTags = catchAsync(async (req, res) => {
  const search = req.query.search as string | undefined;
  const result = await tagService.listTags(search);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Tags fetched successfully.",
    data: result,
  });
});

const createTag = catchAsync(async (req, res) => {
  const { name } = req.body;
  const result = await tagService.createTag(name);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Tag created successfully.",
    data: result,
  });
});

const createTags = catchAsync(async (req, res) => {
  const { names } = req.body;
  const result = await tagService.createTags(names);
  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Tags created successfully.",
    data: result,
  });
});

export const tagController = {
  listTags,
  createTag,
  createTags,
};
