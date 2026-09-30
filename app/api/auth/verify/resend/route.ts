import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { usersCollection } from "@/lib/db";
import { getAppUrl } from "@/lib/http";
import { checkRateLimit, RULES, tooManyRequests } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/resend";
import { VerifyEmail } from "@/lib/emails/verify-email";
import { isUserVerified, isVerificationEnabled, issueVerificationToken, toObjectId } from "@/lib/verification";

/** Send the signed-in user a fresh confirmation link. */
export async function POST(req: Request) {
  try {
    const userId = (await getServerSession(authOptions))?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isVerificationEnabled()) {
      return NextResponse.json({ error: "Email verification isn't enabled" }, { status: 400 });
    }

    const limit = await checkRateLimit("verify-resend", userId, RULES.verifyResend);
    if (!limit.ok) return tooManyRequests(limit.retryAfter, "Too many requests. Please check your inbox or try again later.");

    if (await isUserVerified(userId)) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const oid = toObjectId(userId);
    const user = oid ? await (await usersCollection()).findOne({ _id: oid }, { projection: { email: 1 } }) : null;
    if (!user?.email) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const token = await issueVerificationToken(userId, user.email);
    const emailSent = await sendEmail({
      to: user.email,
      subject: "Confirm your email address",
      react: VerifyEmail({ verifyLink: `${getAppUrl(req)}/verify-email?token=${token}` }),
    });

    if (!emailSent) {
      return NextResponse.json({ error: "We couldn't send the email. Please try again shortly." }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resending verification:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
