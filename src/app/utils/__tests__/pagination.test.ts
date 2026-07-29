import { describe, it, expect } from "vitest";
import {
  buildPaginationQuery,
  buildSortOrder,
  calculatePaginationMeta,
} from "../pagination";

describe("pagination utils", () => {
  describe("buildPaginationQuery", () => {
    it("returns correct skip and take for page 1", () => {
      const result = buildPaginationQuery({ page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
      expect(result).toEqual({ skip: 0, take: 10 });
    });

    it("returns correct skip for page 3 with limit 12", () => {
      const result = buildPaginationQuery({ page: 3, limit: 12, sortBy: "createdAt", sortOrder: "desc" });
      expect(result).toEqual({ skip: 24, take: 12 });
    });

    it("handles page 1 with limit 1", () => {
      const result = buildPaginationQuery({ page: 1, limit: 1, sortBy: "name", sortOrder: "asc" });
      expect(result).toEqual({ skip: 0, take: 1 });
    });
  });

  describe("buildSortOrder", () => {
    it("builds ascending sort order", () => {
      const result = buildSortOrder({ sortBy: "name", sortOrder: "asc" });
      expect(result).toEqual({ name: { sort: "asc" } });
    });

    it("builds descending sort order", () => {
      const result = buildSortOrder({ sortBy: "createdAt", sortOrder: "desc" });
      expect(result).toEqual({ createdAt: { sort: "desc" } });
    });
  });

  describe("calculatePaginationMeta", () => {
    it("calculates correct totalPages", () => {
      const meta = calculatePaginationMeta(25, 1, 10);
      expect(meta).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
    });

    it("returns exact division when total is divisible", () => {
      const meta = calculatePaginationMeta(20, 2, 10);
      expect(meta).toEqual({ page: 2, limit: 10, total: 20, totalPages: 2 });
    });

    it("handles zero total", () => {
      const meta = calculatePaginationMeta(0, 1, 10);
      expect(meta).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
    });

    it("handles single item", () => {
      const meta = calculatePaginationMeta(1, 1, 12);
      expect(meta.totalPages).toBe(1);
    });
  });
});
