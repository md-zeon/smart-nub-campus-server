import { VerificationRejectedData } from "../mail.types";
import { emailLayout } from "./emailLayout";

export const getVerificationRejectedTemplate = (
  data: VerificationRejectedData,
): string => {
  const { name, note } = data;

  return emailLayout(
    "Verification Rejected",
    "#ef4444",
    "Verification Rejected",
    `.note-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }`,
    `<p>Hello ${name},</p>
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
      <a href="${process.env.BETTER_AUTH_URL}" class="button">View Verification Status</a>`,
  );
};
