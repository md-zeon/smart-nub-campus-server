/**
 * Password Reset OTP Template
 * Generates HTML content for password reset OTP
 */

interface PasswordResetOTPData {
  email: string;
  otp: string;
}

export const getPasswordResetOTPTemplate = (
  data: PasswordResetOTPData,
): string => {
  const { otp } = data;
  const appName = "Smart NUB Campus";
  const expiresInMinutes = 5;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .otp-box { background-color: #fee2e2; border: 2px solid #ef4444; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .otp { font-size: 32px; font-weight: bold; color: #7f1d1d; letter-spacing: 8px; }
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
      <h2>Password Reset Request</h2>
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
      
      <p>If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
};
