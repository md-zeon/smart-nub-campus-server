import { describe, it, expect, vi, beforeEach } from "vitest";
import z from "zod";
import validateRequest from "../validateRequest";
import { createMockRequest, createMockResponse, createMockNext } from "../../../__tests__/utils/test-helpers";

describe("validateRequest middleware", () => {
  let req: ReturnType<typeof createMockRequest>;
  let res: ReturnType<typeof createMockResponse>;
  let next: ReturnType<typeof createMockNext>;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it("calls next() for valid request body", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    req.body = { name: "John", age: 25 };
    const middleware = validateRequest(schema);
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "John", age: 25 });
  });

  it("strips unknown fields from request body", () => {
    const schema = z.object({ name: z.string() });
    req.body = { name: "John", unknownField: "should be removed" };
    const middleware = validateRequest(schema);
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "John" });
  });

  it("calls next(error) for invalid request body", () => {
    const schema = z.object({
      body: z.object({ name: z.string().min(1) }),
    });
    req.body = { name: "" };
    const middleware = validateRequest(schema);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    const error = (next as any).mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.issues).toBeDefined();
  });

  it("calls next(error) when required field is missing", () => {
    const schema = z.object({
      body: z.object({ title: z.string() }),
    });
    req.body = {};
    const middleware = validateRequest(schema);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    const error = (next as any).mock.calls[0][0];
    expect(error.issues).toBeDefined();
  });
});
