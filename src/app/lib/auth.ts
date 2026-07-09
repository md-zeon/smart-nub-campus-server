import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins/email-otp";
import { prisma } from "./prisma";
import { UserStatus } from "../../generated/prisma/enums";
import { mailService } from "./mail";
import { EMAIL_OTP_EXPIRES_IN } from "../constants/auth";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  plugins: [
    emailOTP({
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
