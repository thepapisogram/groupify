import { Resend } from "resend";
import type { ReactElement } from "react";

let client: Resend | null = null;

/**
 * Send a transactional email. Never throws: returns false when email isn't
 * configured or the provider rejects the message, so callers can degrade
 * gracefully instead of failing the whole request.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    client ??= new Resend(apiKey);
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM || "Groupify <noreply@groupify.app>",
      to: opts.to,
      subject: opts.subject,
      react: opts.react,
    });
    if (error) {
      console.error("Email provider rejected message:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
