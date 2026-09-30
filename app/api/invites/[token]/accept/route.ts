import { NextRequest, NextResponse } from "next/server";
import { getIdentity } from "@/lib/form-access";
import { formsCollection, invitesCollection } from "@/lib/db";
import { getAppUrl } from "@/lib/http";
import { sendEmail } from "@/lib/resend";
import { InviteAcceptedEmail } from "@/lib/emails/invite-accepted";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const identity = await getIdentity();
    const userEmail = normalizeEmail(identity.email);

    if (!userEmail) {
      if (identity.pendingEmail) {
        // Anyone can sign up with any address, so an invite can only be accepted once it is proven to be theirs.
        return NextResponse.json(
          {
            error:
              "Confirm your email address before accepting this invite. Use the link we emailed you, or request a new one from the banner at the top of the page.",
            code: "email-unverified",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invites = await invitesCollection();
    const invite = await invites.findOne({ _id: token });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: `Invite is already ${invite.status}` }, { status: 400 });
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
    }

    if (normalizeEmail(invite.invitedEmail) !== userEmail) {
      return NextResponse.json({ error: "This invite was sent to a different email address" }, { status: 403 });
    }

    const forms = await formsCollection();
    const form = await forms.findOne({ _id: invite.formId });
    if (!form) {
      return NextResponse.json({ error: "This form no longer exists" }, { status: 404 });
    }

    // Grant access first, then mark the invite used.
    await forms.updateOne(
      { _id: invite.formId },
      { $addToSet: { confirmedAdmins: userEmail } },
    );
    await invites.updateOne(
      { _id: token },
      { $set: { status: "accepted", acceptedAt: new Date() } }
    );

    // Best-effort notification: accepting must succeed even if the email can't be sent.
    if (isValidEmail(invite.invitedBy)) {
      const base = `${getAppUrl(req)}/forms/${invite.formId}/admin`;
      // Owners with an account reach the dashboard via their session; anonymous forms need the link.
      const formUrl = form.userId ? base : `${base}?token=${form.adminToken}`;

      await sendEmail({
        to: invite.invitedBy,
        subject: `${userEmail} accepted your invitation!`,
        react: InviteAcceptedEmail({
          collaboratorEmail: userEmail,
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
