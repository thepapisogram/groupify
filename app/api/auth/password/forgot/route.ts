import { NextResponse } from "next/server";
import { usersCollection } from "@/lib/db";
import { getAppUrl, readJson } from "@/lib/http";
import { sendEmail } from "@/lib/resend";
import { ResetPasswordEmail } from "@/lib/emails/reset-password";
import { isPasswordResetEnabled, issueResetToken } from "@/lib/password-reset";
import { checkRateLimit, getClientIp, RULES, tooManyRequests } from "@/lib/rate-limit";
import { emailLookupCandidates, isValidEmail, normalizeEmail } from "@/lib/validation";

/**
 * Ask for a password-reset link. The answer is the same whether or not the address has an account, so this
 * can't be used to probe for registered emails.
 */
export async function POST(req: Request) {
  try {
    if (!isPasswordResetEnabled()) {
      return NextResponse.json(
        { error: "Password reset by email isn't available on this site right now." },
        { status: 503 },
      );
    }

    const parsed = await readJson(req, 1024);
    if (!parsed.ok) return parsed.response;
    const rawEmail = (parsed.body as { email?: unknown } | null)?.email;
    const email = normalizeEmail(rawEmail);
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // Per address as well as per IP, so nobody can flood one person's inbox.
    const [perIp, perEmail] = await Promise.all([
      checkRateLimit("reset-ip", getClientIp(req.headers), RULES.resetRequestPerIp),
      checkRateLimit("reset-email", email, RULES.resetRequestPerEmail),
    ]);
    if (!perIp.ok || !perEmail.ok) return tooManyRequests(Math.max(perIp.retryAfter, perEmail.retryAfter));

    const user = await (await usersCollection()).findOne({ email: { $in: emailLookupCandidates(rawEmail) } });
    if (user) {
      try {
        const token = await issueResetToken(String(user._id), user.email);
        await sendEmail({
          to: user.email,
          subject: "Reset your Groupify password",
          react: ResetPasswordEmail({ resetLink: `${getAppUrl(req)}/reset-password?token=${token}` }),
        });
      } catch (error) {
        // Don't tell the caller: a different answer would reveal that the account exists.
        console.error("Could not send password reset email:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
