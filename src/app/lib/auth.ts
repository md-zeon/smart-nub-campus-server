import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins/email-otp";
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
    },
  },
});
