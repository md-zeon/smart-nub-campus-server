import { EmailOTPData } from "../mail.types";
import { emailLayout } from "./emailLayout";

export const getVerificationOTPTemplate = (data: EmailOTPData): string => {
  const { otp } = data;
  const expiresInMinutes = 5;

  return emailLayout(
    "Email Verification",
    "#2563eb",
    "Smart NUB Campus",
    `.otp-box { background-color: #e0f2fe; border: 2px solid #0ea5e9; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .otp { font-size: 32px; font-weight: bold; color: #0c4a6e; letter-spacing: 8px; }
    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 14px; }`,
    `<h2>Email Verification Required</h2>
      <p>Hello,</p>
      <p>To complete your registration and verify your email address, please enter the verification code below:</p>
      <div class="otp-box">
        <p style="margin: 0; font-size: 14px; color: #64748b;">Your verification code:</p>
        <p class="otp">${otp}</p>
      </div>
      <p>This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
      <div class="warning">
        <strong>Security Notice:</strong> Never share this verification code with anyone.
        If you did not request this code, please disregard this email.
      </div>
      <p>If you have any questions, please contact our support team.</p>`,
  );
};
