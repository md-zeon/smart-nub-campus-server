import { Resend } from "resend";
import ENVVARS from "../../../config/env";
import { MailProvider, SendMailOptions } from "./mail.interface";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

/**
 * Resend Provider
 * Email provider implementation using Resend SDK
 */
export class ResendProvider implements MailProvider {
  private client: Resend;
  private from: string;

  constructor() {
    // Fail-fast validation
    if (!ENVVARS.RESEND_API_KEY) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "RESEND_API_KEY is required when MAIL_PROVIDER=resend",
      );
    }

    if (!ENVVARS.MAIL_FROM) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "MAIL_FROM is required when MAIL_PROVIDER=resend",
      );
    }

    this.client = new Resend(ENVVARS.RESEND_API_KEY);
    this.from = ENVVARS.MAIL_FROM;
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      await this.client.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      console.error({
        provider: "resend",
        to: options.to,
        subject: options.subject,
        error,
      });
      throw error;
    }
  }
}
