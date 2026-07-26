import { EmailOTPData } from "../mail.types";
import { emailLayout } from "./emailLayout";

export const getPasswordResetOTPTemplate = (data: EmailOTPData): string => {
  const { otp } = data;
  const expiresInMinutes = 5;

  return emailLayout(
    "Reset your password",
    `Your password reset code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    "#dc2626",
    "Smart NUB Campus",
    `.otp-box { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fecaca; border-radius: 12px; padding: 28px 24px; text-align: center; margin: 24px 0; }
    .otp-label { margin: 0 0 8px 0; font-size: 13px; font-weight: 500; color: #dc2626; text-transform: uppercase; letter-spacing: 0.08em; }
    .otp-code { margin: 0; font-size: 36px; font-weight: 700; color: #7f1d1d; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace; }
    .security-notice { background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .security-notice p { margin: 0; font-size: 14px; line-height: 1.6; color: #9a3412; }
    .security-notice strong { color: #7c2d12; }
    .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .info-box p { margin: 0; font-size: 14px; line-height: 1.6; color: #64748b; }
    .info-box strong { color: #334155; }
    @media (prefers-color-scheme: dark) {
      .otp-box { background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%) !important; border-color: #991b1b !important; }
      .otp-label { color: #fca5a5 !important; }
      .otp-code { color: #fee2e2 !important; }
      .security-notice { background-color: #431407 !important; border-color: #7c2d12 !important; }
      .security-notice p { color: #fdba74 !important; }
      .security-notice strong { color: #fed7aa !important; }
      .info-box { background-color: #2e2e50 !important; border-color: #3e3e60 !important; }
      .info-box p { color: #b8b8d0 !important; }
      .info-box strong { color: #e0e0f0 !important; }
    }`,
    `<p class="greeting">Hello,</p>
      <p>We received a request to reset the password for your Smart NUB Campus account.</p>
      <div class="otp-box">
        <p class="otp-label">Your reset code</p>
        <p class="otp-code">${otp}</p>
      </div>
      <div class="info-box">
        <p>This code expires in <strong>${expiresInMinutes} minutes</strong>. For your security, do not share this code with anyone.</p>
      </div>
      <div class="security-notice">
        <p><strong>Didn't request this?</strong> If you did not ask to reset your password, no action is needed &mdash; your account is safe. However, we recommend changing your password if you notice any unusual activity.</p>
      </div>`,
  );
};