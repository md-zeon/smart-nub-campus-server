import ENVVARS from "../../../config/env";
import { MailProvider } from "./mail.interface";
import { ResendProvider } from "./resend.provider";
import { GmailProvider } from "./gmail.provider";
import { GmailApiProvider } from "./gmailApi.provider";

/**
 * Mail Provider Factory
 * Creates the appropriate mail provider based on environment configuration
 */
export function createMailProvider(): MailProvider {
  const providerType = ENVVARS.MAIL_PROVIDER || "resend";

  switch (providerType) {
    case "gmail":
      return new GmailProvider();

    case "gmail-api":
      return new GmailApiProvider();

    case "resend":
      return new ResendProvider();

    default:
      throw new Error(`Unsupported mail provider: ${providerType}`);
  }
}
