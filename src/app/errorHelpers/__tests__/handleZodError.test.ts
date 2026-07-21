import { describe, it, expect } from "vitest";
import z from "zod";
import { handleZodError } from "../handleZodError";

describe("handleZodError", () => {
  it("handles single field validation error", () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = schema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const response = handleZodError(result.error);
      expect(response.success).toBe(false);
      expect(response.statusCode).toBe(400);
      expect(response.message).toBe("Zod Validation Error");
      expect(response.errorSources).toHaveLength(1);
      expect(response.errorSources[0].path).toBe("name");
    }
  });

  it("handles multiple field validation errors", () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(18),
    });
    const result = schema.safeParse({ name: "", email: "invalid", age: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const response = handleZodError(result.error);
      expect(response.errorSources.length).toBeGreaterThanOrEqual(2);
      expect(response.statusCode).toBe(400);
    }
  });

  it("handles nested path errors", () => {
    const schema = z.object({
      user: z.object({ profile: z.object({ bio: z.string().min(1) }) }),
    });
    const result = schema.safeParse({ user: { profile: { bio: "" } } });
    expect(result.success).toBe(false);
    if (!result.success) {
      const response = handleZodError(result.error);
      expect(response.errorSources[0].path).toBe("user.profile.bio");
    }
  });

  it("uses (root) for pathless errors", () => {
    const schema = z.string();
    const result = schema.safeParse(123);
    expect(result.success).toBe(false);
    if (!result.success) {
      const response = handleZodError(result.error);
      expect(response.errorSources[0].path).toBe("(root)");
    }
  });
});
