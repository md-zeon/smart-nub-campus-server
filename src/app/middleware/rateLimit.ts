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
