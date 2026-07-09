export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const buildPaginationQuery = (
  params: PaginationParams & SortParams,
): { skip: number; take: number } => {
  const { page, limit } = params;
  const skip = (page - 1) * limit;
  return { skip, take: limit };
};

export const buildSortOrder = (
  params: SortParams,
): Record<string, { sort: "asc" | "desc" }> => {
  const { sortBy, sortOrder } = params;
  return {
    [sortBy]: { sort: sortOrder },
  } as Record<string, { sort: "asc" | "desc" }>;
};

export const calculatePaginationMeta = <T>(
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T>["meta"] => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};
