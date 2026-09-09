import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

import { resend } from "@/lib/resend";
import { InviteAcceptedEmail } from "@/lib/emails/invite-accepted";
import { ObjectId } from "mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("groupify");
    
    const invite = await db.collection("invites").findOne({ _id: token as unknown as import("mongodb").ObjectId });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: `Invite is already ${invite.status}` }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
    }

    if (invite.invitedEmail !== session.user.email) {
      return NextResponse.json({ error: "This invite was sent to a different email address" }, { status: 403 });
    }

    // Mark invite as accepted
    await db.collection("invites").updateOne(
      { _id: token as unknown as import("mongodb").ObjectId },
      { $set: { status: "accepted", acceptedAt: new Date() } }
    );

    // Fetch form to get admin token for the email link
    let form;
    try {
      form = await db.collection("forms").findOne({ _id: new ObjectId(invite.formId) });
    } catch {
      form = await db.collection("forms").findOne({ _id: invite.formId });
    }

    // Add user to confirmedAdmins
    let updateQuery;
    try {
      updateQuery = { _id: new ObjectId(invite.formId) };
    } catch {
      updateQuery = { _id: invite.formId };
    }

    await db.collection("forms").updateOne(
      updateQuery,
      { $addToSet: { confirmedAdmins: session.user.email } as unknown as import("mongodb").UpdateFilter<Document> }
    );

    // Send notification email to the owner
    if (form && invite.invitedBy && process.env.RESEND_API_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://groupify.vercel.app";
      const formUrl = `${appUrl}/forms/${invite.formId}/admin?token=${form.adminToken}`;
      
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Groupify <noreply@groupify.app>",
        to: invite.invitedBy,
        subject: `${session.user.email} accepted your invitation!`,
        react: InviteAcceptedEmail({
          collaboratorEmail: session.user.email,
          formTitle: invite.formTitle,
          formUrl,
        }),
      });
    }

    return NextResponse.json({ success: true, formId: invite.formId });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
