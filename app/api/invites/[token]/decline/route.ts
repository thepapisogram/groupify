import { NextRequest, NextResponse } from "next/server";
import { invitesCollection } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invites = await invitesCollection();

    const invite = await invites.findOne({ _id: token });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: `Invite is already ${invite.status}` }, { status: 400 });
    }

    await invites.updateOne({ _id: token }, { $set: { status: "declined" } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error declining invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
