import status from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { searchService } from "./search.service";
import { SearchFilters, SearchTypeFilter } from "./search.interface";

const search = catchAsync(async (req, res) => {
  const q = (req.query.q as string) ?? "";
  const type = (req.query.type as SearchTypeFilter) ?? "all";
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;

  const filters: SearchFilters = {
    department: req.query.department as string | undefined,
    categoryId: req.query.categoryId as string | undefined,
    courseId: req.query.courseId as string | undefined,
  };

  const result =
    type === "all"
      ? await searchService.globalSearch(q, page, limit, filters)
      : await searchService.searchEntity(type, q, page, limit, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Search completed successfully.",
    data: result,
  });
});

export const searchController = {
  search,
};
