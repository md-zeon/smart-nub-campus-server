import { VerificationUser } from "../mail.types";

/**
 * Generates HTML content for verification approved email
 */
export const getVerificationApprovedTemplate = (
  user: VerificationUser,
): string => {
  const { name } = user;
  const appName = "Smart NUB Campus";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Approved</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #22c55e; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verification Approved</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Your verification request has been approved! You can now proceed with account creation on ${appName}.</p>
      <p>If you have any questions, please contact our support team.</p>
      <a href="${process.env.BETTER_AUTH_URL}" class="button">Continue to ${appName}</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
};
