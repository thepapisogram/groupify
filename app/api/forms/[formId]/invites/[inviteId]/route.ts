import { NextRequest, NextResponse } from "next/server";
import { authorizeForm } from "@/lib/form-access";
import { formsCollection, invitesCollection } from "@/lib/db";
import { normalizeEmail } from "@/lib/validation";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string, inviteId: string }> }
) {
  try {
    const { formId, inviteId } = await params;

    const auth = await authorizeForm(req, formId, "owner");
    if (!auth.ok) return auth.response;

    const invites = await invitesCollection();
    const invite = await invites.findOne({ _id: inviteId, formId });

    // The UI sends the collaborator's email as the id when no invite record exists.
    const emailToRemove = normalizeEmail(invite ? invite.invitedEmail : decodeURIComponent(inviteId));

    if (emailToRemove) {
      const remaining = (auth.form.confirmedAdmins ?? []).filter(
        (a) => normalizeEmail(a) !== emailToRemove,
      );
      await (await formsCollection()).updateOne(
        { _id: formId },
        { $set: { confirmedAdmins: remaining } },
      );
    }

    if (invite) {
      await invites.deleteOne({ _id: inviteId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
