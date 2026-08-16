import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins/email-otp";
import { bearer } from "better-auth/plugins/bearer";
import { prisma } from "./prisma";
import { UserStatus } from "../../generated/prisma/enums";
import { mailService } from "./mail";
import { EMAIL_OTP_EXPIRES_IN } from "../constants/auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import ENVVARS from "../../config/env";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  basePath: "/api/v1/auth",
  trustedOrigins: ENVVARS.CORS_ORIGINS,
  // Cross-site cookies (Vercel frontend -> Render backend). `partitioned`
  // (CHIPS) keeps the session cookie usable under Chrome's third-party
  // cookie blocking, scoped to the frontend's top-level site.
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: { sameSite: "none", partitioned: true },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/api/v1/auth/sign-in/email") {
        const user = await prisma.user.findUnique({
          where: {
            email: ctx.body.email,
          },
        });

        if (user?.isDeleted) {
          throw new APIError("FORBIDDEN", {
            message: "Account not found.",
          });
        }

        if (user && !user.emailVerified) {
          throw new APIError("FORBIDDEN", {
            message: "Please verify your email.",
          });
        }

        if (user?.status === UserStatus.SUSPENDED) {
          throw new APIError("FORBIDDEN", {
            message: "Account suspended.",
          });
        }

        if (user?.status === UserStatus.BANNED) {
          throw new APIError("FORBIDDEN", {
            message: "Account banned.",
          });
        }

        if (user?.isDeactivated) {
          throw new APIError("FORBIDDEN", {
            message: "Account deactivated.",
          });
        }

        return ctx;
      } else if (ctx.path === "/api/v1/auth/sign-up/email") {
        const user = await prisma.user.findUnique({
          where: {
            email: ctx.body.email,
          },
        });

        if (user) {
          throw new APIError("CONFLICT", {
            message: "User with this email already exists.",
          });
        }

        return ctx;
      }
    }),
  },
  plugins: [
    // Email OTP plugin configuration
    emailOTP({
      // Function to send the verification OTP email when requested
      sendVerificationOTP: async ({ email, otp, type }) => {
        // Check if a user with this email exists before sending
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (!user) {
          // Silently return to prevent email enumeration
          return;
        }

        if (type === "email-verification") {
          await mailService.sendEmailVerificationOTP({ email, otp });
        } else if (type === "forget-password") {
          await mailService.sendPasswordResetOTP({ email, otp });
        }
      },
      expiresIn: EMAIL_OTP_EXPIRES_IN,
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
    }),
    // Validates the `Authorization: Bearer <session-token>` header used by
    // the Socket.IO handshake (see socket middleware auth.middleware.ts).
    bearer(),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: UserStatus.ACTIVE,
      },
      isDeleted: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        defaultValue: null,
      },
      gender: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      imagePublicId: {
        type: "string",
        required: false,
        defaultValue: null,
      },
    },
  },
});
