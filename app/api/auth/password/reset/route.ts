import { NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { consumeResetToken } from "@/lib/password-reset";
import { checkRateLimit, getClientIp, RULES, tooManyRequests } from "@/lib/rate-limit";
import { validatePassword } from "@/lib/validation";

/** Set a new password with the token from the emailed link. */
export async function POST(req: Request) {
  try {
    const limit = await checkRateLimit("reset-attempt", getClientIp(req.headers), RULES.resetAttempt);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const parsed = await readJson(req, 2 * 1024);
    if (!parsed.ok) return parsed.response;
    const { token, password: rawPassword } = (parsed.body ?? {}) as Record<string, unknown>;

    // Checked before the token is spent, so a too-short password can be corrected without a new link.
    const password = validatePassword(rawPassword);
    if (!password.ok) return NextResponse.json({ error: password.error }, { status: 400 });

    const result = await consumeResetToken(token, password.value);
    if (!result.ok) {
      const error =
        result.reason === "expired"
          ? "This link has expired. Request a new one."
          : "This link isn't valid. It may have already been used.";
      return NextResponse.json({ error, reason: result.reason }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
