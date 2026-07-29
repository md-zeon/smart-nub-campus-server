import { rateLimit, Options } from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import ENVVARS from "../../config/env";

const rateLimitingDisabled =
  ENVVARS.DISABLE_RATE_LIMIT ||
  ENVVARS.NODE_ENV === "development" ||
  ENVVARS.NODE_ENV === "test";

const noopLimiter = (_req: Request, _res: Response, next: NextFunction) =>
  next();

const sharedDefaults: Pick<Options, "standardHeaders" | "legacyHeaders"> = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
};

function createLimiter(options: Partial<Options>) {
  if (rateLimitingDisabled) {
    return noopLimiter;
  }
  return rateLimit({ ...sharedDefaults, ...options });
}

const rateLimitResponse = (message: string) => ({
  success: false,
  message,
  errorSources: [],
});

export const loginRateLimiter = createLimiter({
  windowMs: ENVVARS.RATE_LIMIT_LOGIN_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_LOGIN_MAX,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse("Too many login attempts. Please try again later."),
    );
  },
});

export const otpRateLimiter = createLimiter({
  windowMs: ENVVARS.RATE_LIMIT_OTP_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_OTP_MAX,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many verification code requests. Please try again later.",
      ),
    );
  },
});

export const passwordResetRateLimiter = createLimiter({
  windowMs: ENVVARS.RATE_LIMIT_OTP_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_OTP_MAX,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many password reset requests. Please try again later.",
      ),
    );
  },
});

export const verificationRateLimiter = createLimiter({
  windowMs: ENVVARS.RATE_LIMIT_VERIFICATION_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_VERIFICATION_MAX,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many verification requests. Please try again later.",
      ),
    );
  },
});

export const onboardingRateLimiter = createLimiter({
  windowMs: ENVVARS.RATE_LIMIT_ONBOARDING_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_ONBOARDING_MAX,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many onboarding requests. Please try again later.",
      ),
    );
  },
});

export const teamCreateRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many team creation requests. Please try again later.",
      ),
    );
  },
});

export const teamApplyRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many team application requests. Please try again later.",
      ),
    );
  },
});

export const aiChatRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many AI chat messages. Please try again later.",
      ),
    );
  },
});

export const aiToolRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many AI tool requests. Please try again later.",
      ),
    );
  },
});

export const uploadRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many upload requests. Please try again later.",
      ),
    );
  },
});

export const onboardingUploadRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many onboarding upload requests. Please try again later.",
      ),
    );
  },
});

export const globalRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse("Too many requests. Please try again later."),
    );
  },
});

export const signUpRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many sign-up attempts. Please try again later.",
      ),
    );
  },
});
