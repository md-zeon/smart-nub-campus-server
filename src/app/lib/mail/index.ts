import { createMailService } from "./mail.service";
import { createMailProvider } from "./mail.factory";

/**
 * Mail Module Entry Point
 * Initializes and exports the mail service singleton
 */
const provider = createMailProvider();
export const mailService = createMailService(provider);

// Export types for external use
export type { MailProvider, SendMailOptions } from "./mail.interface";
export type {
  VerificationUser,
  VerificationRejectedData,
  EmailOTPData,
} from "./mail.types";
