import { describe, it, expect, vi } from "vitest";
import { createMockRequest, createMockResponse, createMockNext } from "../../../__tests__/utils/test-helpers";

const callLimiter = async (limiter: (req: any, res: any, next: any) => unknown) => {
  const req = createMockRequest();
  req.ip = "127.0.0.1";
  (req as any).app = { get: vi.fn().mockReturnValue(false) };
  const res = createMockResponse();
  const next = createMockNext();
  await limiter(req as any, res as any, next as any);
  return { res, next };
};

describe("rate limiters (disabled)", () => {
  it("returns a noop limiter when DISABLE_RATE_LIMIT is true", async () => {
    vi.resetModules();
    vi.doMock("../../../config/env", () => ({
      default: {
        NODE_ENV: "production",
        DISABLE_RATE_LIMIT: true,
      },
    }));

    const { loginRateLimiter, globalRateLimiter } = await import("../rateLimit");

    const login = await callLimiter(loginRateLimiter);
    expect(login.next).toHaveBeenCalled();
    expect(login.res.status).not.toHaveBeenCalled();

    const global = await callLimiter(globalRateLimiter);
    expect(global.next).toHaveBeenCalled();
    expect(global.res.status).not.toHaveBeenCalled();
  });

  it("returns a noop limiter in development mode", async () => {
    vi.resetModules();
    vi.doMock("../../../config/env", () => ({
      default: {
        NODE_ENV: "development",
        DISABLE_RATE_LIMIT: false,
      },
    }));

    const { loginRateLimiter } = await import("../rateLimit");

    const result = await callLimiter(loginRateLimiter);
    expect(result.next).toHaveBeenCalled();
    expect(result.res.status).not.toHaveBeenCalled();
  });

  it("returns a noop limiter in test mode", async () => {
    vi.resetModules();
    vi.doMock("../../../config/env", () => ({
      default: {
        NODE_ENV: "test",
        DISABLE_RATE_LIMIT: false,
      },
    }));

    const { loginRateLimiter } = await import("../rateLimit");

    const result = await callLimiter(loginRateLimiter);
    expect(result.next).toHaveBeenCalled();
    expect(result.res.status).not.toHaveBeenCalled();
  });
});
