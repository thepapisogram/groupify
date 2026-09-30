import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { compare, hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { usersCollection } from "@/lib/db";
import { readJson } from "@/lib/http";
import { checkRateLimit, RULES, tooManyRequests } from "@/lib/rate-limit";
import { validatePassword } from "@/lib/validation";
import { toObjectId } from "@/lib/verification";

/**
 * Change the password of the signed-in account. The current password is required, so a stolen session on its
 * own can't lock the owner out. Every session started before the change is voided (including this one, so the
 * page signs back in with the new password).
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const oid = toObjectId(session?.user?.id);
    if (!oid) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

    // Counts every attempt, right or wrong, so the current password can't be guessed from a hijacked session.
    const limit = await checkRateLimit("pw-change", String(oid), RULES.changePassword);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const parsed = await readJson(req, 2 * 1024);
    if (!parsed.ok) return parsed.response;
    const { currentPassword, newPassword } = (parsed.body ?? {}) as Record<string, unknown>;

    const users = await usersCollection();
    const user = await users.findOne({ _id: oid }, { projection: { password: 1 } });
    if (!user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

    if (!user.password) {
      return NextResponse.json(
        {
          code: "no-password",
          error: "This account signs in with Google and has no password yet. Use “Forgot password” on the log in page to add one.",
        },
        { status: 400 },
      );
    }

    if (typeof currentPassword !== "string" || !(await compare(currentPassword, user.password))) {
      return NextResponse.json({ code: "wrong-password", error: "Your current password is incorrect." }, { status: 400 });
    }

    const next = validatePassword(newPassword);
    if (!next.ok) return NextResponse.json({ code: "invalid-password", error: next.error }, { status: 400 });
    if (next.value === currentPassword) {
      return NextResponse.json(
        { code: "same-password", error: "Your new password must be different from the current one." },
        { status: 400 },
      );
    }

    await users.updateOne(
      { _id: oid },
      { $set: { password: await hash(next.value, 12), sessionsValidAfter: new Date() } },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
