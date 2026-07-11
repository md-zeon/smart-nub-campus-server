/**
 * Mail Service
 * Business facade for email operations - composes emails and delegates to provider
 */

import { MailProvider, SendMailOptions } from "./mail.interface";
import {
  VerificationRejectedData,
  VerificationUser,
  EmailOTPData,
} from "./mail.types";
import { getVerificationApprovedTemplate } from "./templates/verificationApproved";
import { getVerificationRejectedTemplate } from "./templates/verificationRejected";
import { getVerificationOTPTemplate } from "./templates/emailVerificationOtp";
import { getPasswordResetOTPTemplate } from "./templates/passwordResetOtp";

/**
 * Creates the mail service with the given provider
 * Business logic layer that composes emails and sends via provider
 */
export function createMailService(provider: MailProvider) {
  const send = async (options: SendMailOptions): Promise<void> => {
    await provider.send(options);
  };

  const sendVerificationApproved = async (
    user: VerificationUser,
  ): Promise<void> => {
    const html = getVerificationApprovedTemplate(user);

    await send({
      to: user.email,
      subject: "Verification Request Approved - Smart NUB Campus",
      html,
    });
  };

  const sendVerificationRejected = async (
    user: VerificationRejectedData,
  ): Promise<void> => {
    const html = getVerificationRejectedTemplate(user);

    await send({
      to: user.email,
      subject: "Verification Request Rejected - Smart NUB Campus",
      html,
    });
  };

  const sendEmailVerificationOTP = async (
    data: EmailOTPData,
  ): Promise<void> => {
    const html = getVerificationOTPTemplate(data);

    await send({
      to: data.email,
      subject: "Email Verification - Smart NUB Campus",
      html,
    });
  };

  const sendPasswordResetOTP = async (data: EmailOTPData): Promise<void> => {
    const html = getPasswordResetOTPTemplate(data);

    await send({
      to: data.email,
      subject: "Password Reset - Smart NUB Campus",
      html,
    });
  };

  return {
    send,
    sendVerificationApproved,
    sendVerificationRejected,
    sendEmailVerificationOTP,
    sendPasswordResetOTP,
  };
}
