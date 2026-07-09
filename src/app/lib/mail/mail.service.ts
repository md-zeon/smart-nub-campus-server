import ENVVARS from "../../../config/env";
import { SendMailOptions, VerificationRejectedData, VerificationUser } from "./mail.types";
import { resend } from "./transporter";
import { getVerificationApprovedTemplate } from "./templates/verificationApproved";
import { getVerificationRejectedTemplate } from "./templates/verificationRejected";

/**
 * Mail Service
 * Centralized email sending service for the application
 */

const send = async (options: SendMailOptions): Promise<void> => {
  try {
    await resend.emails.send({
      from: ENVVARS.MAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error) {
    // TODO: Replace console.error with centralized logger when available
    console.error("Failed to send email:", error);
    // Email failure should not affect business operations
  }
};

const sendVerificationApproved = async (user: VerificationUser): Promise<void> => {
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

export const mailService = {
  send,
  sendVerificationApproved,
  sendVerificationRejected,
};