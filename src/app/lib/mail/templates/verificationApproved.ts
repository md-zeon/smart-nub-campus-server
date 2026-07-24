import { VerificationUser } from "../mail.types";
import { emailLayout, APP_NAME } from "./emailLayout";

export const getVerificationApprovedTemplate = (
  user: VerificationUser,
): string => {
  const { name } = user;

  return emailLayout(
    "Verification Approved",
    "#22c55e",
    "Verification Approved",
    `.button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }`,
    `<p>Hello ${name},</p>
      <p>Your verification request has been approved! You can now proceed with account creation on ${APP_NAME}.</p>
      <p>If you have any questions, please contact our support team.</p>
      <a href="${process.env.BETTER_AUTH_URL}" class="button">Continue to ${APP_NAME}</a>`,
  );
};
