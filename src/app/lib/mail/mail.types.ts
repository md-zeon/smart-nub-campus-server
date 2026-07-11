/**
 * Mail Types
 * Centralized type definitions for the mail service
 */

export interface VerificationUser {
  name: string;
  email: string;
}

export interface VerificationRejectedData extends VerificationUser {
  note?: string | null;
}

export interface EmailOTPData {
  email: string;
  otp: string;
}

// Re-export SendMailOptions from interface file for convenience
export { SendMailOptions } from "./mail.interface";
