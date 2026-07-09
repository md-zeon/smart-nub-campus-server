import { Resend } from "resend";
import ENVVARS from "../../../config/env";

/**
 * Email Transporter
 * Initialized Resend client with API key from environment
 */
const resend = new Resend(ENVVARS.RESEND_API_KEY);

export { resend };
