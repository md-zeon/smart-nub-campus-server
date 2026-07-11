import nodemailer from "nodemailer";
import ENVVARS from "../../../config/env";
import { MailProvider, SendMailOptions } from "./mail.interface";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

/**
 * Gmail Provider
 * Email provider implementation using Nodemailer with Gmail SMTP
 */
export class GmailProvider implements MailProvider {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor() {
    // Fail-fast validation
    if (!ENVVARS.GMAIL_USER) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "GMAIL_USER is required when MAIL_PROVIDER=gmail",
      );
    }

    if (!ENVVARS.GMAIL_APP_PASSWORD) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "GMAIL_APP_PASSWORD is required when MAIL_PROVIDER=gmail",
      );
    }

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: ENVVARS.GMAIL_USER,
        pass: ENVVARS.GMAIL_APP_PASSWORD,
      },
    });

    this.from = ENVVARS.GMAIL_USER;
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      console.error({
        provider: "gmail",
        to: options.to,
        subject: options.subject,
        error,
      });
      throw error;
    }
  }
}
