import { VerificationRejectedData } from "../mail.types";

/**
 * Generates HTML content for verification rejected email
 */
export const getVerificationRejectedTemplate = (
  data: VerificationRejectedData,
): string => {
  const { name, note } = data;
  const appName = "Smart NUB Campus";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Rejected</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .note-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verification Rejected</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Your verification request has been reviewed and could not be approved at this time.</p>
      ${
        note
          ? `<div class="note-box">
          <strong>Note from reviewer:</strong>
          <p>${note}</p>
        </div>`
          : ""
      }
      <p>You may resubmit your verification request with updated information.</p>
      <a href="${process.env.BETTER_AUTH_URL}" class="button">View Verification Status</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
};
