import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { searchService } from "./search.service";
import {
  SearchClickInput,
  SearchEntityFilter,
  SearchFilters,
} from "./search.interface";

const search = catchAsync(async (req, res) => {
  const q = req.query.q as string;
  const entity = (req.query.entity as SearchEntityFilter | undefined) ?? "all";
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;

  const filters: SearchFilters = {
    department: req.query.department as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
    courseId: req.query.courseId as string | undefined,
  };

  const result = await searchService.search(req.user.id, q, entity, page, limit, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Search completed successfully.",
    data: result,
  });
});

const recordClick = catchAsync(async (req, res) => {
  await searchService.recordClick(req.user.id, req.body as SearchClickInput);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Search click recorded.",
    data: null,
  });
});

export const searchController = {
  search,
  recordClick,
};
