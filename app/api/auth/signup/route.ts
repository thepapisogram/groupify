import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { usersCollection } from "@/lib/db";
import { getAppUrl, readJson } from "@/lib/http";
import { sendEmail } from "@/lib/resend";
import { VerifyEmail } from "@/lib/emails/verify-email";
import { isVerificationEnabled, issueVerificationToken } from "@/lib/verification";
import { checkRateLimit, getClientIp, RULES, tooManyRequests } from "@/lib/rate-limit";
import {
  cleanName,
  emailLookupCandidates,
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from "@/lib/validation";

/** Email the confirmation link. Never throws: the user can ask for another from the banner. */
async function sendVerification(req: Request, userId: string, email: string): Promise<boolean> {
  try {
    const token = await issueVerificationToken(userId, email);
    return await sendEmail({
      to: email,
      subject: "Confirm your email address",
      react: VerifyEmail({ verifyLink: `${getAppUrl(req)}/verify-email?token=${token}` }),
    });
  } catch (error) {
    console.error("Could not send verification email:", error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const limit = await checkRateLimit("signup", getClientIp(req.headers), RULES.signup);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const parsed = await readJson(req, 4 * 1024);
    if (!parsed.ok) return parsed.response;
    const { email: rawEmail, password: rawPassword, name } = (parsed.body ?? {}) as Record<string, unknown>;

    const email = normalizeEmail(rawEmail);
    if (!email || !rawPassword) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const password = validatePassword(rawPassword);
    if (!password.ok) {
      return NextResponse.json({ message: password.error }, { status: 400 });
    }

    const users = await usersCollection();

    const existingUser = await users.findOne({ email: { $in: emailLookupCandidates(rawEmail) } });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password.value, 12);

    const newUser = await users.insertOne({
      email,
      name: cleanName(name, email.split("@")[0]),
      password: hashedPassword,
      // Unverified until they click the emailed link. Existing accounts predate this field.
      emailVerified: null,
      createdAt: new Date(),
    });

    const verificationRequired = isVerificationEnabled();
    const verificationSent = verificationRequired
      ? await sendVerification(req, String(newUser.insertedId), email)
      : false;

    return NextResponse.json(
      { message: "User created successfully", userId: newUser.insertedId, verificationRequired, verificationSent },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "An error occurred during signup" },
      { status: 500 }
    );
  }
}
