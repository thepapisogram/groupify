import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string, inviteId: string }> }
) {
  try {
    const { formId, inviteId } = await params;
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

    // Find the invite to see if it was accepted
    const invite = await db.collection("invites").findOne({ _id: inviteId as unknown as import("mongodb").ObjectId, formId });
    
    // If we're removing an active admin who might not have an invite record (e.g. system added)
    // we use their email directly. The UI sends the email as the inviteId if no record exists.
    const emailToRemove = invite ? invite.invitedEmail : inviteId;

    if (emailToRemove) {
      await db.collection("forms").updateOne(
        { _id: formId as unknown as import("mongodb").ObjectId },
        { $pull: { confirmedAdmins: emailToRemove } as unknown as import("mongodb").UpdateFilter<Document> }
      );
    }

    if (invite) {
      // Hard delete the invite record
      await db.collection("invites").deleteOne({ _id: inviteId as unknown as import("mongodb").ObjectId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
