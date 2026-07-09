/**
 * Mail Types
 * Centralized type definitions for the mail service
 */

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface VerificationUser {
  name: string;
  email: string;
}

export interface VerificationRejectedData extends VerificationUser {
  note?: string | null;
}
