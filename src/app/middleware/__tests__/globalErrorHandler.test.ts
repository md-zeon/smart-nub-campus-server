import { describe, it, expect, vi, beforeEach } from "vitest";
import z from "zod";
import globalErrorHandler from "../globalErrorHandler";
import AppError from "../AppError";
import { createMockRequest, createMockResponse, createMockNext } from "../../../__tests__/utils/test-helpers";

vi.mock("../../../config/env", () => ({
  default: { NODE_ENV: "test" },
}));

describe("globalErrorHandler", () => {
  let req: ReturnType<typeof createMockRequest>;
  let res: ReturnType<typeof createMockResponse>;
  let next: ReturnType<typeof createMockNext>;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    vi.clearAllMocks();
  });

  it("handles AppError with correct status code and message", () => {
    const error = new AppError(404, "Resource not found");
    globalErrorHandler(error, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Resource not found",
      }),
    );
  });

  it("handles ZodError with 400 status", () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      globalErrorHandler(result.error, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Zod Validation Error",
        }),
      );
    }
  });

  it("handles generic Error with 500 status", () => {
    const error = new Error("Something went wrong");
    globalErrorHandler(error, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Something went wrong",
      }),
    );
  });

  it("includes errorSources for ZodError", () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "invalid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      globalErrorHandler(result.error, req, res, next);
      const call = (res.json as any).mock.calls[0][0];
      expect(call.errorSources).toBeDefined();
      expect(call.errorSources.length).toBeGreaterThan(0);
    }
  });

  it("returns default 500 for unknown error types", () => {
    const error = "string error";
    globalErrorHandler(error, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
