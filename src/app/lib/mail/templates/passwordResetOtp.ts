import { EmailOTPData } from "../mail.types";
import { emailLayout } from "./emailLayout";

export const getPasswordResetOTPTemplate = (data: EmailOTPData): string => {
  const { otp } = data;
  const expiresInMinutes = 5;

  return emailLayout(
    "Password Reset",
    "#dc2626",
    "Smart NUB Campus",
    `.otp-box { background-color: #fee2e2; border: 2px solid #ef4444; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .otp { font-size: 32px; font-weight: bold; color: #7f1d1d; letter-spacing: 8px; }
    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 14px; }`,
    `<h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset the password for your account. Please enter the following code to create a new password:</p>
      <div class="otp-box">
        <p style="margin: 0; font-size: 14px; color: #64748b;">Your reset code:</p>
        <p class="otp">${otp}</p>
      </div>
      <p>This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
      <div class="warning">
        <strong>Security Notice:</strong> Never share this reset code with anyone.
        If you did not request a password reset, please disregard this email and ensure your account is secure.
      </div>
      <p>If you have any questions, please contact our support team.</p>`,
  );
};
