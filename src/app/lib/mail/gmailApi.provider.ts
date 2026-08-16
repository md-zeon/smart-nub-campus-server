import nodemailer from "nodemailer";
import ENVVARS from "../../../config/env";
import { MailProvider, SendMailOptions } from "./mail.interface";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

/**
 * Gmail API Provider
 * Email provider implementation using the Gmail REST API with OAuth2.
 * Uses HTTPS only, so it works on hosts that block outbound SMTP
 * (for example Render free web services, which block ports 25/465/587).
 */

const GMAIL_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export class GmailApiProvider implements MailProvider {
  private from: string;

  constructor() {
    // Fail-fast validation
    if (!ENVVARS.GMAIL_USER) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "GMAIL_USER is required when MAIL_PROVIDER=gmail-api",
      );
    }

    if (!ENVVARS.GMAIL_API_CLIENT_ID) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "GMAIL_API_CLIENT_ID is required when MAIL_PROVIDER=gmail-api",
      );
    }

    if (!ENVVARS.GMAIL_API_CLIENT_SECRET) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "GMAIL_API_CLIENT_SECRET is required when MAIL_PROVIDER=gmail-api",
      );
    }

    if (!ENVVARS.GMAIL_API_REFRESH_TOKEN) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        "GMAIL_API_REFRESH_TOKEN is required when MAIL_PROVIDER=gmail-api",
      );
    }

    this.from = ENVVARS.GMAIL_USER;
  }

  /**
   * Exchanges the OAuth2 refresh token for a short-lived access token.
   * The refresh token must be issued for the gmail.send scope.
   */
  private async getAccessToken(): Promise<string> {
    const params = new URLSearchParams({
      client_id: ENVVARS.GMAIL_API_CLIENT_ID as string,
      client_secret: ENVVARS.GMAIL_API_CLIENT_SECRET as string,
      refresh_token: ENVVARS.GMAIL_API_REFRESH_TOKEN as string,
      grant_type: "refresh_token",
    });

    const response = await fetch(GMAIL_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AppError(
        status.UNAUTHORIZED,
        `Gmail OAuth token refresh failed (${response.status}): ${body}`,
      );
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new AppError(
        status.UNAUTHORIZED,
        "Gmail OAuth token refresh returned no access_token",
      );
    }

    return data.access_token;
  }

  /**
   * Composes the RFC822 message (headers + body) and returns it as a Buffer,
   * ready for base64url encoding. Reuses nodemailer's mail composer via the
   * stream transport, so no SMTP connection is involved.
   */
  private async buildRawMessage(options: SendMailOptions): Promise<Buffer> {
    const composer = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });

    const info = await composer.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return info.message as Buffer;
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      const raw = (await this.buildRawMessage(options)).toString("base64url");

      const response = await fetch(GMAIL_API_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new AppError(
          status.BAD_GATEWAY,
          `Gmail API send failed (${response.status}): ${body}`,
        );
      }
    } catch (error) {
      console.error({
        provider: "gmail-api",
        to: options.to,
        subject: options.subject,
        error,
      });
      throw error;
    }
  }
}
