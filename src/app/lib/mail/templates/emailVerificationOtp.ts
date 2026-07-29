import { EmailOTPData } from "../mail.types";
import { emailLayout } from "./emailLayout";

export const getVerificationOTPTemplate = (data: EmailOTPData): string => {
  const { otp } = data;
  const expiresInMinutes = 5;

  return emailLayout(
    "Verify your email address",
    `Your verification code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    "#4f46e5",
    "Smart NUB Campus",
    `.otp-box { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border: 1px solid #c7d2fe; border-radius: 12px; padding: 28px 24px; text-align: center; margin: 24px 0; }
    .otp-label { margin: 0 0 8px 0; font-size: 13px; font-weight: 500; color: #6366f1; text-transform: uppercase; letter-spacing: 0.08em; }
    .otp-code { margin: 0; font-size: 36px; font-weight: 700; color: #312e81; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace; }
    .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .info-box p { margin: 0; font-size: 14px; line-height: 1.6; color: #64748b; }
    .info-box strong { color: #334155; }
    .spam-tip { background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 20px; margin: 24px 0; }
    .spam-tip p { margin: 0; font-size: 13px; line-height: 1.5; color: #92400e; }
    @media (prefers-color-scheme: dark) {
      .otp-box { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%) !important; border-color: #4338ca !important; }
      .otp-label { color: #a5b4fc !important; }
      .otp-code { color: #e0e7ff !important; }
      .info-box { background-color: #2e2e50 !important; border-color: #3e3e60 !important; }
      .info-box p { color: #b8b8d0 !important; }
      .info-box strong { color: #e0e0f0 !important; }
      .spam-tip { background-color: #422006 !important; border-color: #854d0e !important; }
      .spam-tip p { color: #fde68a !important; }
    }`,
    `<p class="greeting">Hello,</p>
      <p>We received a request to verify your email address for your Smart NUB Campus account.</p>
      <div class="otp-box">
        <p class="otp-label">Your verification code</p>
        <p class="otp-code">${otp}</p>
      </div>
      <div class="info-box">
        <p>This code expires in <strong>${expiresInMinutes} minutes</strong>. For your security, do not share this code with anyone.</p>
      </div>
      <p>If you did not request this verification, you can safely ignore this email. Your account will remain unchanged.</p>
      <div class="spam-tip">
        <p>Can't find the email? Check your <strong>spam or junk folder</strong> &mdash; sometimes verification emails end up there.</p>
      </div>`,
  );
};