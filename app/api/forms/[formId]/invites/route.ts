import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import crypto from "crypto";
import { resend } from "@/lib/resend";
import { InviteEmail } from "@/lib/emails/invite";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  try {
    const { formId } = await params;
    const adminToken = req.nextUrl.searchParams.get("token");

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("groupify");
    const form = await db.collection("forms").findOne({ _id: formId as unknown as import("mongodb").ObjectId });

    if (!form || form.adminToken !== adminToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invites = await db.collection("invites").find({ formId }).toArray();

    // Separate into pending and active/accepted
    const pending = invites.filter(
      (i) => i.status === "pending" && new Date(i.expiresAt) > new Date(),
    );
    const expired = invites.filter(
      (i) => i.status === "pending" && new Date(i.expiresAt) <= new Date(),
    );

    // Active collaborators are those who have accepted, but we also want to display them cleanly
    // For "Active", we just look at confirmedAdmins on the form
    const activeEmails = form.confirmedAdmins || [];
    const active = activeEmails.map((email: string) => {
      // Find the invite record if it exists to get the ID for deletion
      const invite = invites.find(
        (i) => i.invitedEmail === email && i.status === "accepted",
      );
      return {
        email,
        inviteId: invite?._id || email, // Use email as fallback ID if no invite record (e.g. system added)
      };
    });

    return NextResponse.json({ pending: [...pending, ...expired], active });
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
    const adminToken = req.nextUrl.searchParams.get("token");

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getServerSession(authOptions);
    const ownerEmail = session?.user?.email || "Form Owner";

    const client = await clientPromise;
    const db = client.db("groupify");
    const form = await db.collection("forms").findOne({ _id: formId as unknown as import("mongodb").ObjectId });

    if (!form || form.adminToken !== adminToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (email === session?.user?.email) {
      return NextResponse.json(
        { error: "Cannot invite yourself" },
        { status: 400 },
      );
    }

    const userExists = await db.collection("users").findOne({ email });
    if (!userExists) {
      return NextResponse.json(
        { error: "User with this email does not exist on Groupify" },
        { status: 404 }
      );
    }

    const confirmedAdmins = form.confirmedAdmins || [];
    if (confirmedAdmins.includes(email)) {
      return NextResponse.json(
        { error: "User is already an active collaborator" },
        { status: 400 },
      );
    }

    const existingInvite = await db.collection("invites").findOne({
      formId,
      invitedEmail: email,
      status: "pending",
    });

    // If there's an existing invite, we could resend. For now, let's just create a new one and overwrite.
    // Or just check if it's expired.
    if (existingInvite && new Date(existingInvite.expiresAt) > new Date()) {
      return NextResponse.json(
        { error: "A pending invite already exists for this email" },
        { status: 400 },
      );
    }

    // Generate new invite
    const token = crypto.randomBytes(8).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.collection("invites").insertOne({
      _id: token as unknown as import("mongodb").ObjectId,
      formId,
      formTitle: form.title,
      invitedEmail: email,
      invitedBy: ownerEmail,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const inviteLink = `${appUrl}/invites/${token}`;
    const declineLink = `${appUrl}/invites/${token}/decline`;

    // Send email
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Groupify <noreply@groupify.app>",
        to: email,
        subject: `You have been invited to collaborate on ${form.title}`,
        react: InviteEmail({
          invitedBy: ownerEmail,
          formTitle: form.title,
          inviteLink,
          declineLink,
        }),
      });
    }

    return NextResponse.json({ success: true, inviteId: token });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
