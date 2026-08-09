import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockRequest, createMockResponse, createMockNext } from "../../../__tests__/utils/test-helpers";

vi.mock("../../../config/env", () => ({
  default: {
    NODE_ENV: "production",
    DISABLE_RATE_LIMIT: false,
    RATE_LIMIT_LOGIN_WINDOW_MS: 1000,
    RATE_LIMIT_LOGIN_MAX: 2,
    RATE_LIMIT_OTP_WINDOW_MS: 1000,
    RATE_LIMIT_OTP_MAX: 2,
    RATE_LIMIT_VERIFICATION_WINDOW_MS: 1000,
    RATE_LIMIT_VERIFICATION_MAX: 2,
    RATE_LIMIT_ONBOARDING_WINDOW_MS: 1000,
    RATE_LIMIT_ONBOARDING_MAX: 2,
  },
}));

import {
  loginRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
  verificationRateLimiter,
  onboardingRateLimiter,
  teamCreateRateLimiter,
  teamApplyRateLimiter,
  aiChatRateLimiter,
  aiToolRateLimiter,
  uploadRateLimiter,
  onboardingUploadRateLimiter,
  globalRateLimiter,
  signUpRateLimiter,
} from "../rateLimit";

const makeRequest = () => {
  const req = createMockRequest();
  req.ip = "127.0.0.1";
  (req as any).app = { get: vi.fn().mockReturnValue(false) };
  return req;
};

const invoke = async (limiter: (req: any, res: any, next: any) => unknown) => {
  const req = makeRequest();
  const res = createMockResponse();
  const next = createMockNext();
  await limiter(req as any, res as any, next as any);
  return { res, next };
};

const allLimiters = [
  loginRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
  verificationRateLimiter,
  onboardingRateLimiter,
  teamCreateRateLimiter,
  teamApplyRateLimiter,
  aiChatRateLimiter,
  aiToolRateLimiter,
  uploadRateLimiter,
  onboardingUploadRateLimiter,
  globalRateLimiter,
  signUpRateLimiter,
];

const resetLimiters = () => {
  for (const limiter of allLimiters) {
    (limiter as any).resetKey?.("127.0.0.1");
  }
};

describe("rate limiters (enabled)", () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetLimiters();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the configured max and blocks the next one", async () => {
    const first = await invoke(loginRateLimiter);
    expect(first.next).toHaveBeenCalled();
    expect(first.res.status).not.toHaveBeenCalled();

    const second = await invoke(loginRateLimiter);
    expect(second.next).toHaveBeenCalled();

    const third = await invoke(loginRateLimiter);
    expect(third.next).not.toHaveBeenCalled();
    expect(third.res.status).toHaveBeenCalledWith(429);
    expect(third.res.json).toHaveBeenCalledWith({
      success: false,
      message: "Too many login attempts. Please try again later.",
      errorSources: [],
    });
  });

  it("resets the counter after the window elapses", async () => {
    vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });

    const first = await invoke(loginRateLimiter);
    expect(first.next).toHaveBeenCalled();
    const second = await invoke(loginRateLimiter);
    expect(second.next).toHaveBeenCalled();

    const blocked = await invoke(loginRateLimiter);
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.res.status).toHaveBeenCalledWith(429);

    vi.advanceTimersByTime(1001);

    const afterReset = await invoke(loginRateLimiter);
    expect(afterReset.next).toHaveBeenCalled();
    expect(afterReset.res.status).not.toHaveBeenCalled();
  });

  it("tracks hits independently for each limiter", async () => {
    await invoke(loginRateLimiter);
    await invoke(loginRateLimiter);
    await invoke(loginRateLimiter);
    expect((await invoke(loginRateLimiter)).next).not.toHaveBeenCalled();

    const otp = await invoke(otpRateLimiter);
    expect(otp.next).toHaveBeenCalled();
    expect(otp.res.status).not.toHaveBeenCalled();
  });

  const limiters = [
    { limiter: loginRateLimiter, message: "Too many login attempts. Please try again later." },
    { limiter: otpRateLimiter, message: "Too many verification code requests. Please try again later." },
    { limiter: passwordResetRateLimiter, message: "Too many password reset requests. Please try again later." },
    { limiter: verificationRateLimiter, message: "Too many verification requests. Please try again later." },
    { limiter: onboardingRateLimiter, message: "Too many onboarding requests. Please try again later." },
    { limiter: teamCreateRateLimiter, message: "Too many team creation requests. Please try again later." },
    { limiter: teamApplyRateLimiter, message: "Too many team application requests. Please try again later." },
    { limiter: aiChatRateLimiter, message: "Too many AI chat messages. Please try again later." },
    { limiter: aiToolRateLimiter, message: "Too many AI tool requests. Please try again later." },
    { limiter: uploadRateLimiter, message: "Too many upload requests. Please try again later." },
    { limiter: onboardingUploadRateLimiter, message: "Too many onboarding upload requests. Please try again later." },
    { limiter: globalRateLimiter, message: "Too many requests. Please try again later." },
    { limiter: signUpRateLimiter, message: "Too many sign-up attempts. Please try again later." },
  ];

  it("responds with 429 and its specific message for every limiter", async () => {
    for (const { limiter, message } of limiters) {
      let blocked = { res: createMockResponse(), next: createMockNext() };
      let underLimit = true;
      while (underLimit) {
        blocked = await invoke(limiter);
        underLimit = blocked.next.mock.calls.length > 0;
      }
      expect(blocked.res.status).toHaveBeenCalledWith(429);
      expect(blocked.res.json).toHaveBeenCalledWith({
        success: false,
        message,
        errorSources: [],
      });
    }
  });
});
