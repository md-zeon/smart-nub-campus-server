import { describe, it, expect } from "vitest";
import AppError from "../AppError";

describe("AppError", () => {
  it("creates an error with statusCode and message", () => {
    const error = new AppError(404, "Not found");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Not found");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it("captures stack trace by default", () => {
    const error = new AppError(500, "Server error");
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("AppError");
  });

  it("uses provided stack when given", () => {
    const customStack = "custom stack trace";
    const error = new AppError(400, "Bad request", customStack);
    expect(error.stack).toBe(customStack);
  });

  it("has correct name", () => {
    const error = new AppError(403, "Forbidden");
    expect(error.name).toBe("Error");
  });
});
