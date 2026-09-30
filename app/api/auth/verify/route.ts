import { NextResponse } from "next/server";
import { readJson } from "@/lib/http";
import { checkRateLimit, getClientIp, RULES, tooManyRequests } from "@/lib/rate-limit";
import { consumeVerificationToken } from "@/lib/verification";

/**
 * Complete verification. This is a POST (called by the /verify-email page) rather than a GET
 * link, so mail scanners that pre-fetch links can't use up the one-time token.
 */
export async function POST(req: Request) {
  try {
    const limit = await checkRateLimit("verify", getClientIp(req.headers), RULES.verifyAttempt);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const parsed = await readJson(req, 1024);
    if (!parsed.ok) return parsed.response;
    const token = (parsed.body as { token?: unknown } | null)?.token;

    const result = await consumeVerificationToken(token);
    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "This link has expired. Sign in and request a new one."
          : "This link isn't valid. It may have already been used.";
      return NextResponse.json({ error: message, reason: result.reason }, { status: 400 });
    }

    return NextResponse.json({ success: true, email: result.email });
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
