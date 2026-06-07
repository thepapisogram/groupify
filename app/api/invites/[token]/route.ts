import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const client = await clientPromise;
    const db = client.db("groupify");

    const invite = await db.collection("invites").findOne({ _id: token as unknown as import("mongodb").ObjectId });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    return NextResponse.json({
      formTitle: invite.formTitle,
      invitedBy: invite.invitedBy,
      status: invite.status,
      expiresAt: invite.expiresAt,
      invitedEmail: invite.invitedEmail,
      formId: invite.formId,
    });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
