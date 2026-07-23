import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { IndexRoutes } from "./app/routes";
import globalErrorHandler from "./app/middleware/globalErrorHandler";
import notFound from "./app/middleware/notFound";
import {
  loginRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
  globalRateLimiter,
} from "./app/middleware/rateLimit";
import { requestLogger } from "./app/middleware/requestLogger";
import cors from "cors";
import ENVVARS from "./config/env";

const app: Application = express();

// Security headers
app.use(helmet());

// Trust first proxy (required for correct req.ip behind reverse proxies)
app.set("trust proxy", 1);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse cookies
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Enable CORS
app.use(
  cors({
    origin: ENVVARS.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// Global rate limiting (100 requests per 15 minutes)
app.use("/api/v1", globalRateLimiter);

// Rate limiting for public endpoints
app.use("/api/v1/auth/sign-in", loginRateLimiter);
app.use("/api/v1/auth/email-otp/send-verification-otp", otpRateLimiter);
app.use(
  "/api/v1/auth/email-otp/request-password-reset",
  passwordResetRateLimiter,
);

// routes
app.use("/api/v1", IndexRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.send("Welcome to the Smart NUB Campus API");
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
