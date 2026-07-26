import { VerificationRejectedData } from "../mail.types";
import { emailLayout, SUPPORT_EMAIL } from "./emailLayout";

export const getVerificationRejectedTemplate = (
  data: VerificationRejectedData,
): string => {
  const { name, note } = data;
  const authUrl = process.env.BETTER_AUTH_URL || "#";

  return emailLayout(
    "Your verification needs attention",
    `${name}, your verification request was not approved. Please review the feedback and resubmit.`,
    "#dc2626",
    "Smart NUB Campus",
    `.notice-icon { width: 56px; height: 56px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; }
    .notice-icon span { font-size: 28px; color: #dc2626; }
    .note-box { background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .note-box .note-label { margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #9a3412; text-transform: uppercase; letter-spacing: 0.05em; }
    .note-box p { margin: 0; font-size: 14px; line-height: 1.6; color: #7c2d12; }
    .button { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; margin-top: 8px; }
    .button:hover { background-color: #4338ca; }
    .button-wrapper { text-align: center; margin: 28px 0; }
    .help-text { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .help-text p { margin: 0; font-size: 14px; line-height: 1.6; color: #64748b; }
    .help-text a { color: #4f46e5; }
    @media (prefers-color-scheme: dark) {
      .notice-icon { background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%) !important; }
      .notice-icon span { color: #fca5a5 !important; }
      .note-box { background-color: #431407 !important; border-color: #7c2d12 !important; }
      .note-box .note-label { color: #fdba74 !important; }
      .note-box p { color: #fed7aa !important; }
      .button { background-color: #6366f1 !important; }
      .button:hover { background-color: #818cf8 !important; }
      .help-text { background-color: #2e2e50 !important; border-color: #3e3e60 !important; }
      .help-text p { color: #b8b8d0 !important; }
      .help-text a { color: #818cf8 !important; }
    }`,
    `<div class="notice-icon"><span>!</span></div>
      <h2>Verification Not Approved</h2>
      <p class="greeting">Hello ${name},</p>
      <p>After reviewing your verification request, we were unable to approve it at this time. This may be due to unclear documentation, mismatched information, or other compliance requirements.</p>
      ${
        note
          ? `<div class="note-box">
          <p class="note-label">Feedback from our team</p>
          <p>${note}</p>
        </div>`
          : ""
      }
      <p>Don't worry &mdash; you can resubmit your verification request with updated information.</p>
      <div class="button-wrapper">
        <a href="${authUrl}" class="button">Resubmit Verification</a>
      </div>
      <div class="help-text">
        <p>Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and we'll assist you with the verification process.</p>
      </div>`,
  );
};