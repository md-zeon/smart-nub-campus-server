import { rateLimit } from "express-rate-limit";
import ENVVARS from "../../config/env";

const rateLimitResponse = (message: string) => ({
  success: false,
  message,
  errorSources: [],
});

export const loginRateLimiter = rateLimit({
  windowMs: ENVVARS.RATE_LIMIT_LOGIN_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_LOGIN_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse("Too many login attempts. Please try again later."),
    );
  },
});

export const otpRateLimiter = rateLimit({
  windowMs: ENVVARS.RATE_LIMIT_OTP_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_OTP_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many verification code requests. Please try again later.",
      ),
    );
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: ENVVARS.RATE_LIMIT_OTP_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_OTP_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many password reset requests. Please try again later.",
      ),
    );
  },
});

export const verificationRateLimiter = rateLimit({
  windowMs: ENVVARS.RATE_LIMIT_VERIFICATION_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_VERIFICATION_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many verification requests. Please try again later.",
      ),
    );
  },
});

export const onboardingRateLimiter = rateLimit({
  windowMs: ENVVARS.RATE_LIMIT_OTP_WINDOW_MS,
  max: ENVVARS.RATE_LIMIT_OTP_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many onboarding requests. Please try again later.",
      ),
    );
  },
});

export const teamCreateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many team creation requests. Please try again later.",
      ),
    );
  },
});

export const teamApplyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many team application requests. Please try again later.",
      ),
    );
  },
});

export const aiChatRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many AI chat messages. Please try again later.",
      ),
    );
  },
});

export const aiToolRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many AI tool requests. Please try again later.",
      ),
    );
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 uploads per hour
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many upload requests. Please try again later.",
      ),
    );
  },
});

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many requests. Please try again later.",
      ),
    );
  },
});

export const signUpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 sign-up attempts per hour
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      rateLimitResponse(
        "Too many sign-up attempts. Please try again later.",
      ),
    );
  },
});
