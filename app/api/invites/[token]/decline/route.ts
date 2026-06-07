import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(
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

    if (invite.status !== "pending") {
      return NextResponse.json({ error: `Invite is already ${invite.status}` }, { status: 400 });
    }

    // Mark invite as declined
    await db.collection("invites").updateOne(
      { _id: token as unknown as import("mongodb").ObjectId },
      { $set: { status: "declined" } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error declining invite:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
