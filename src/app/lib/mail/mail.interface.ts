/**
 * Mail Provider Interface
 * Defines the contract for all email providers
 */

export interface MailProvider {
  send(options: SendMailOptions): Promise<void>;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}
