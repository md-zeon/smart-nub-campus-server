import { describe, it, expect, vi, beforeEach } from "vitest";
import requireRole from "../requireRole";
import { createMockRequest, createMockResponse, createMockNext } from "../../../__tests__/utils/test-helpers";

describe("requireRole middleware", () => {
  let req: ReturnType<typeof createMockRequest>;
  let res: ReturnType<typeof createMockResponse>;
  let next: ReturnType<typeof createMockNext>;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it("calls next() when user has the required role", () => {
    req.user = { role: "ADMIN" } as any;
    const middleware = requireRole("ADMIN");
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next() when user role is in the allowed list", () => {
    req.user = { role: "STUDENT" } as any;
    const middleware = requireRole("STUDENT", "ADMIN");
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("throws error when user is not authenticated", () => {
    req.user = undefined as any;
    const middleware = requireRole("ADMIN");
    expect(() => middleware(req, res, next)).toThrow("Authentication required.");
  });

  it("throws error when user role is not allowed", () => {
    req.user = { role: "STUDENT" } as any;
    const middleware = requireRole("ADMIN");
    expect(() => middleware(req, res, next)).toThrow("You do not have permission to access this resource.");
  });

  it("throws error with FORBIDDEN status for wrong role", () => {
    req.user = { role: "STUDENT" } as any;
    const middleware = requireRole("ADMIN");
    try {
      middleware(req, res, next);
    } catch (error: any) {
      expect(error.statusCode).toBe(403);
    }
  });

  it("throws error with UNAUTHORIZED status for missing user", () => {
    req.user = undefined as any;
    const middleware = requireRole("ADMIN");
    try {
      middleware(req, res, next);
    } catch (error: any) {
      expect(error.statusCode).toBe(401);
    }
  });
});
