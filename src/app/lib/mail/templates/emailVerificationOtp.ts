/**
 * Email Verification OTP Template
 * Generates HTML content for email verification OTP
 */

import { EmailOTPData } from "../mail.types";

export const getVerificationOTPTemplate = (data: EmailOTPData): string => {
  const { otp } = data;
  const appName = "Smart NUB Campus";
  const expiresInMinutes = 5;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .otp-box { background-color: #e0f2fe; border: 2px solid #0ea5e9; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .otp { font-size: 32px; font-weight: bold; color: #0c4a6e; letter-spacing: 8px; }
    .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 14px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${appName}</h1>
    </div>
    <div class="content">
      <h2>Email Verification Required</h2>
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
      
      <p>If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
};
