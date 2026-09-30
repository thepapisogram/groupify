import { NextRequest, NextResponse } from "next/server";
import { invitesCollection } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invite = await (await invitesCollection()).findOne({ _id: token });

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
