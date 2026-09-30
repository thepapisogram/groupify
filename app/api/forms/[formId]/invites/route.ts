import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { authorizeForm } from "@/lib/form-access";
import { invitesCollection, usersCollection } from "@/lib/db";
import { getAppUrl, readJson } from "@/lib/http";
import { checkRateLimit, getClientIp, RULES, tooManyRequests } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/resend";
import { InviteEmail } from "@/lib/emails/invite";
import { emailLookupCandidates, isValidEmail, normalizeEmail } from "@/lib/validation";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "collaborator");
    if (!auth.ok) return auth.response;

    const invites = await (await invitesCollection()).find({ formId }).toArray();
    const now = new Date();

    const pending = invites.filter((i) => i.status === "pending");
    const activeEmails = auth.form.confirmedAdmins ?? [];
    const active = activeEmails.map((email) => {
      const invite = invites.find(
        (i) => normalizeEmail(i.invitedEmail) === normalizeEmail(email) && i.status === "accepted",
      );
      return {
        email,
        // Falls back to the email so an admin without an invite record can still be removed.
        inviteId: invite?._id ?? email,
      };
    });

    return NextResponse.json({
      pending: pending.map((i) => ({
        _id: i._id,
        invitedEmail: i.invitedEmail,
        expiresAt: i.expiresAt,
        expired: new Date(i.expiresAt) <= now,
      })),
      active,
    });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  try {
    const { formId } = await params;

    const auth = await authorizeForm(req, formId, "owner");
    if (!auth.ok) return auth.response;

    const limit = await checkRateLimit("invite", getClientIp(req.headers), RULES.invite);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const parsedBody = await readJson(req, 2 * 1024);
    if (!parsedBody.ok) return parsedBody.response;
    const rawEmail = (parsedBody.body as { email?: unknown } | null)?.email;

    const email = normalizeEmail(rawEmail);
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const inviterEmail = normalizeEmail(auth.identity.email);
    if (email === inviterEmail) {
      return NextResponse.json(
        { error: "Cannot invite yourself" },
        { status: 400 },
      );
    }

    const userExists = await (await usersCollection()).findOne({
      email: { $in: emailLookupCandidates(rawEmail) },
    });
    if (!userExists) {
      return NextResponse.json(
        { error: "User with this email does not exist on Groupify" },
        { status: 404 }
      );
    }

    const confirmedAdmins = auth.form.confirmedAdmins ?? [];
    if (confirmedAdmins.some((a) => normalizeEmail(a) === email)) {
      return NextResponse.json(
        { error: "User is already an active collaborator" },
        { status: 400 },
      );
    }

    const invites = await invitesCollection();
    const now = new Date();

    const existingInvite = await invites.findOne({
      formId,
      invitedEmail: email,
      status: "pending",
    });

    if (existingInvite) {
      if (new Date(existingInvite.expiresAt) > now) {
        return NextResponse.json(
          { error: "A pending invite already exists for this email" },
          { status: 400 },
        );
      }
      // Expired: replace it rather than leaving stale rows behind.
      await invites.deleteOne({ _id: existingInvite._id });
    }

    const token = crypto.randomBytes(8).toString("hex");
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    const invitedBy = inviterEmail || "The form owner";

    await invites.insertOne({
      _id: token,
      formId,
      formTitle: auth.form.title,
      invitedEmail: email,
      invitedBy,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

    const appUrl = getAppUrl(req);
    const inviteLink = `${appUrl}/invites/${token}`;
    const declineLink = `${appUrl}/invites/${token}/decline`;

    const emailSent = await sendEmail({
      to: email,
      subject: `You have been invited to collaborate on ${auth.form.title}`,
      react: InviteEmail({
        invitedBy,
        formTitle: auth.form.title,
        inviteLink,
        declineLink,
      }),
    });

    // If email couldn't be delivered the owner still gets the link to pass on themselves.
    return NextResponse.json({
      success: true,
      inviteId: token,
      emailSent,
      ...(emailSent ? {} : { inviteLink }),
    });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
