import dotenv from "dotenv";
import AppError from "../app/errorHelpers/AppError";
import status from "http-status";

dotenv.config();

interface EnvConfig {
  NODE_ENV: "development" | "production" | "test";
  PORT: string;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  // CORS
  CORS_ORIGINS: string[];
  // Rate limiting
  DISABLE_RATE_LIMIT: boolean;
  RATE_LIMIT_LOGIN_WINDOW_MS: number;
  RATE_LIMIT_LOGIN_MAX: number;
  RATE_LIMIT_OTP_WINDOW_MS: number;
  RATE_LIMIT_OTP_MAX: number;
  RATE_LIMIT_VERIFICATION_WINDOW_MS: number;
  RATE_LIMIT_VERIFICATION_MAX: number;
  RATE_LIMIT_ONBOARDING_WINDOW_MS: number;
  RATE_LIMIT_ONBOARDING_MAX: number;
  // Cloudinary credentials
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLOUDINARY_FOLDER?: string;
  MAX_UPLOAD_SIZE_MB?: string;
  // Resend provider credentials (optional - validated in ResendProvider)
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  // Mail provider selection
  MAIL_PROVIDER: "gmail" | "resend";
  // Gmail provider credentials (optional - validated in GmailProvider)
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
}

const loadEnvVariables = (): EnvConfig => {
  const requiredEnvVariables = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    // RESEND_API_KEY and MAIL_FROM are validated in ResendProvider constructor
    // GMAIL_USER and GMAIL_APP_PASSWORD are validated in GmailProvider constructor
  ];
  for (const variable of requiredEnvVariables) {
    if (!process.env[variable]) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Environment variable ${variable} is required but not defined in .env file`,
      );
    }
  }
  return {
    NODE_ENV: process.env.NODE_ENV as "development" | "production" | "test",
    PORT: process.env.PORT as string,
    DATABASE_URL: process.env.DATABASE_URL as string,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET as string,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL as string,
    CORS_ORIGINS: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
      : process.env.NODE_ENV === "production"
        ? [] // No CORS origins in production unless explicitly configured
        : ["http://localhost:3000"],
    // Rate limiting
    DISABLE_RATE_LIMIT: process.env.DISABLE_RATE_LIMIT === "true",
    RATE_LIMIT_LOGIN_WINDOW_MS: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || 900_000,
    RATE_LIMIT_LOGIN_MAX: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 5,
    RATE_LIMIT_OTP_WINDOW_MS: Number(process.env.RATE_LIMIT_OTP_WINDOW_MS) || 600_000,
    RATE_LIMIT_OTP_MAX: Number(process.env.RATE_LIMIT_OTP_MAX) || 3,
    RATE_LIMIT_VERIFICATION_WINDOW_MS: Number(process.env.RATE_LIMIT_VERIFICATION_WINDOW_MS) || 86_400_000,
    RATE_LIMIT_VERIFICATION_MAX: Number(process.env.RATE_LIMIT_VERIFICATION_MAX) || 5,
    RATE_LIMIT_ONBOARDING_WINDOW_MS: Number(process.env.RATE_LIMIT_ONBOARDING_WINDOW_MS) || 900_000,
    RATE_LIMIT_ONBOARDING_MAX: Number(process.env.RATE_LIMIT_ONBOARDING_MAX) || 20,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string,
    CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER as string | undefined,
    MAX_UPLOAD_SIZE_MB: process.env.MAX_UPLOAD_SIZE_MB as string | undefined,
    // Mail provider credentials - optional, validated in provider constructors
    RESEND_API_KEY: process.env.RESEND_API_KEY as string | undefined,
    MAIL_FROM: process.env.MAIL_FROM as string | undefined,
    MAIL_PROVIDER:
      (process.env.MAIL_PROVIDER as "gmail" | "resend") || "resend",
    GMAIL_USER: process.env.GMAIL_USER as string | undefined,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD as string | undefined,
  };
};

const ENVVARS = loadEnvVariables();

export default ENVVARS;
