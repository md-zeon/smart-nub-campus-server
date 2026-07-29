import { VerificationUser } from "../mail.types";
import { emailLayout, APP_NAME } from "./emailLayout";

export const getVerificationApprovedTemplate = (
  user: VerificationUser,
): string => {
  const { name } = user;
  const authUrl = process.env.BETTER_AUTH_URL || "#";

  return emailLayout(
    "Your verification has been approved",
    `${name}, your account has been verified. You can now complete your registration.`,
    "#16a34a",
    "Smart NUB Campus",
    `.success-icon { width: 56px; height: 56px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; }
    .success-icon span { font-size: 28px; }
    .button { display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; margin-top: 8px; }
    .button:hover { background-color: #4338ca; }
    .button-wrapper { text-align: center; margin: 28px 0; }
    .info-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .info-box p { margin: 0; font-size: 14px; line-height: 1.6; color: #166534; }
    @media (prefers-color-scheme: dark) {
      .success-icon { background: linear-gradient(135deg, #052e16 0%, #14532d 100%) !important; }
      .button { background-color: #6366f1 !important; }
      .button:hover { background-color: #818cf8 !important; }
      .info-box { background-color: #052e16 !important; border-color: #14532d !important; }
      .info-box p { color: #86efac !important; }
    }`,
    `<div class="success-icon"><span>&#10003;</span></div>
      <h2>Verification Approved</h2>
      <p class="greeting">Hello ${name},</p>
      <p>Great news! Your identity verification has been approved. You're one step away from accessing ${APP_NAME}.</p>
      <div class="info-box">
        <p><strong>Next step:</strong> Complete your account creation to get started with Smart NUB Campus.</p>
      </div>
      <div class="button-wrapper">
        <a href="${authUrl}" class="button">Complete Registration</a>
      </div>
      <p>If you have any questions, feel free to reach out to our support team.</p>`,
  );
};